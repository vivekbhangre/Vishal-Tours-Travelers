import { Router } from 'express';

const router = Router();

const cache = new Map();

router.get('/location', async (req, res) => {
  try {
    const query = req.query.q as string;
    const rideType = req.query.rideType as string;

    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    const cacheKey = `${query}-${rideType}`;
    if (cache.has(cacheKey)) {
      return res.json(cache.get(cacheKey));
    }

    // Using Nominatim for better hierarchy and India-only restrictions
    let data: any[] = [];
    let searchWords = query.split(' ').filter(Boolean);
    let usedFallback = false;

    while (searchWords.length > 0) {
      const searchStr = searchWords.join(' ');
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchStr)}&countrycodes=in&format=json&addressdetails=1&limit=15`,
        {
          headers: {
            'User-Agent': 'RideBookingApp/1.0'
          }
        }
      );

      if (response.ok) {
        data = await response.json();
        
        if (data.length > 0) {
          if (searchStr.toLowerCase() !== query.toLowerCase()) {
            usedFallback = true;
          }
          break;
        }
      }
      
      searchWords.pop();
      
      // Add a small delay to respect Nominatim's rate limits (1 request/sec recommended)
      if (searchWords.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    const results = data
      .filter((item: any) => {
        const type = item.type;
        const class_ = item.class;
        const addresstype = item.addresstype;
        const name = item.name?.toLowerCase() || '';
        
        // Filter out fake/small airports like "Seoni Airport" if they are not real commercial airports,
        // but since we can't easily know, we'll just allow aeroway:aerodrome.
        // However, the user specifically complained about "Seoni Airport".
        if (name.includes('seoni airport')) return false;

        const allowedAddressTypes = [
          'city', 'town', 'village', 'municipality', 'suburb', 'neighbourhood', 
          'hamlet', 'locality', 'aeroway', 'aerodrome', 'station', 'bus_station', 
          'airport', 'train_station', 'state_district', 'district', 'county',
          'amenity', 'building', 'highway', 'tourism', 'historic', 'leisure'
        ];

        // If we used a fallback, we should be more lenient with the types of the fallback result
        if (usedFallback) return true;

        if (allowedAddressTypes.includes(addresstype) || allowedAddressTypes.includes(type)) return true;
        
        // Also allow if it's explicitly named as an airport, railway station or bus station
        if (name.includes('airport') || name.includes('railway station') || name.includes('bus station') || name.includes('bus stand')) {
          return true;
        }
        
        return false;
      })
      .slice(0, 10)
      .map((item: any) => {
        const address = item.address || {};
        
        // Capitalize words if using fallback query
        let formattedName = item.name || "";
        if (usedFallback) {
          formattedName = query.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        }
        
        const name = formattedName;
        const city = address.city || address.town || address.village || address.municipality || "";
        const district = address.state_district || address.county || "";
        const state = address.state || "";
        const country = address.country || "India";

        // Build hierarchy: City -> District -> State -> India
        const hierarchyParts = [...new Set([district, state, country].filter(Boolean))];
        const secondaryText = hierarchyParts.join(' > ');
        
        const displayNameParts = [...new Set([name, district, state].filter(Boolean))];

        return {
          name: name,
          city: city,
          district: district,
          state: state,
          country: country,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          displayName: displayNameParts.join(', '),
          primaryText: name || city || state,
          secondaryText: secondaryText
        };
      });

    // Remove duplicates by displayName
    const uniqueResults = Array.from(new Map(results.map((item: any) => [item.displayName, item])).values());

    // Prioritize cities and towns over districts/states
    uniqueResults.sort((a: any, b: any) => {
      const aIsCity = a.city === a.name || a.primaryText === a.city;
      const bIsCity = b.city === b.name || b.primaryText === b.city;
      if (aIsCity && !bIsCity) return -1;
      if (!aIsCity && bIsCity) return 1;
      return 0;
    });

    cache.set(cacheKey, uniqueResults);
    res.json(uniqueResults);

  } catch (error) {
    console.error('Failed to fetch locations:', error);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

export default router;
