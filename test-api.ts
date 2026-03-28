import axios from 'axios';

async function fetchWithFallback(query) {
  let currentQuery = query;
  let words = currentQuery.split(' ').filter(Boolean);
  
  while (words.length > 0) {
    const searchStr = words.join(' ');
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchStr)}&countrycodes=in&format=json&addressdetails=1&limit=15`, {
        headers: { 'User-Agent': 'RideBookingApp/1.0' }
      });
      
      let data = res.data;
      if (data.length > 0) {
        // If we found a fallback, let's modify the results to reflect the original query
        if (searchStr !== query) {
          data = data.map(item => {
            const address = item.address || {};
            const city = address.city || address.town || address.village || address.municipality || "";
            const district = address.state_district || address.county || "";
            const state = address.state || "";
            
            const displayNameParts = [...new Set([query, district, state].filter(Boolean))];
            
            return {
              ...item,
              name: query,
              displayName: displayNameParts.join(', '),
              primaryText: query
            };
          });
        }
        return data;
      }
    } catch (e) {
      console.error(e.message);
    }
    
    words.pop(); // remove last word and try again
  }
  
  return [];
}

async function run() {
  const r1 = await fetchWithFallback("seoni bus stand");
  console.log("seoni bus stand:", r1.map(r => r.displayName || r.display_name));
}
run();
