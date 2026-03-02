import { Router } from 'express';

const router = Router();

const cities = [
  "Chhindwara",
  "Nagpur",
  "Seoni",
  "Jabalpur",
  "Bhopal",
  "Indore",
  "Kedarnath",
  "Badrinath",
  "Delhi",
  "Mumbai",
  "Pune",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Surat",
  "Jaipur",
  "Lucknow",
  "Kanpur",
  "Thane",
  "Visakhapatnam",
  "Pimpri-Chinchwad",
  "Patna",
  "Vadodara",
  "Ghaziabad",
  "Ludhiana",
  "Agra",
  "Nashik",
  "Faridabad",
  "Meerut",
  "Rajkot",
  "Kalyan-Dombivli",
  "Vasai-Virar",
  "Varanasi",
  "Srinagar",
  "Aurangabad",
  "Dhanbad",
  "Amritsar",
  "Navi Mumbai",
  "Allahabad",
  "Ranchi",
  "Howrah",
  "Coimbatore",
  "Gwalior",
  "Vijayawada",
  "Jodhpur",
  "Madurai",
  "Raipur",
  "Kota",
  "Guwahati",
  "Chandigarh",
  "Solapur",
  "Hubli-Dharwad",
  "Bareilly",
  "Moradabad",
  "Mysore",
  "Gurgaon",
  "Aligarh",
  "Jalandhar",
  "Tiruchirappalli",
  "Bhubaneswar",
  "Salem",
  "Mira-Bhayandar",
  "Warangal",
  "Thiruvananthapuram",
  "Bhiwandi",
  "Saharanpur",
  "Guntur",
  "Amravati",
  "Bikaner",
  "Noida",
  "Jamshedpur",
  "Bhilai",
  "Cuttack",
  "Firozabad",
  "Kochi",
  "Bhavnagar",
  "Dehradun",
  "Durgapur",
  "Asansol",
  "Nanded",
  "Kolhapur",
  "Ajmer",
  "Gulbarga",
  "Jamnagar",
  "Ujjain",
  "Loni",
  "Siliguri",
  "Jhansi",
  "Ulhasnagar",
  "Nellore",
  "Jammu",
  "Sangli-Miraj & Kupwad",
  "Belgaum",
  "Mangalore",
  "Ambattur",
  "Tirunelveli",
  "Malegaon",
  "Gaya",
  "Jalgaon",
  "Udaipur",
  "Maheshtala"
];

// Levenshtein distance implementation
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

router.get('/city-suggestions', (req, res) => {
  const input = req.query.q as string;
  
  if (!input || input.trim() === '') {
    return res.json({ input: input || '', suggestions: [] });
  }

  const normalizedInput = input.toLowerCase().trim();
  
  // Calculate distances
  const scoredCities = cities.map(city => {
    const normalizedCity = city.toLowerCase();
    
    // Exact match gets highest priority
    if (normalizedCity === normalizedInput) {
      return { city, score: 0 };
    }
    
    // Starts with gets high priority
    if (normalizedCity.startsWith(normalizedInput)) {
      return { city, score: 0.5 };
    }
    
    // Contains gets medium priority
    if (normalizedCity.includes(normalizedInput)) {
      return { city, score: 1 };
    }
    
    // Otherwise calculate Levenshtein distance
    const distance = levenshteinDistance(normalizedInput, normalizedCity);
    return { city, score: distance + 2 }; // Add 2 to prioritize startsWith/includes
  });

  // Sort by score and take top 5
  scoredCities.sort((a, b) => a.score - b.score);
  
  const suggestions = scoredCities
    .slice(0, 5)
    .filter(item => item.score < 5) // Only return reasonable matches
    .map(item => item.city);

  res.json({
    input,
    suggestions
  });
});

export default router;
