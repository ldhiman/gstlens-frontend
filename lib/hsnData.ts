export interface HsnSacItem {
  code: string;
  type: "HSN" | "SAC";
  description: string;
  gstRate: number; // in percentage e.g. 18
  category: string;
  details?: string;
}

export const POPULAR_HSN_SAC_CODES: HsnSacItem[] = [
  // --- Professional & IT Services (SAC) ---
  {
    code: "998311",
    type: "SAC",
    description: "Management consulting and management services",
    gstRate: 18,
    category: "Professional & IT",
    details: "Advisory, guidance, and operational assistance to businesses."
  },
  {
    code: "998313",
    type: "SAC",
    description: "Information technology (IT) consulting and support services",
    gstRate: 18,
    category: "Professional & IT",
    details: "Software architecture, IT systems audit, infrastructure consulting."
  },
  {
    code: "998314",
    type: "SAC",
    description: "Information technology design and development services",
    gstRate: 18,
    category: "Professional & IT",
    details: "Custom software development, web design, mobile app development."
  },
  {
    code: "998222",
    type: "SAC",
    description: "Accounting, bookkeeping and auditing services",
    gstRate: 18,
    category: "Professional & IT",
    details: "Financial statements preparation, tax compliance, statutory audit."
  },
  {
    code: "998211",
    type: "SAC",
    description: "Legal advisory and representation services",
    gstRate: 18,
    category: "Professional & IT",
    details: "Legal counsel, drafting, court representation (Note: RCM may apply under Sec 9(3))."
  },
  {
    code: "998361",
    type: "SAC",
    description: "Advertising services and provision of advertising space",
    gstRate: 18,
    category: "Marketing & Media",
    details: "Digital marketing, social media ads, billboard campaigns."
  },

  // --- Real Estate, Hospitality & Transport ---
  {
    code: "997212",
    type: "SAC",
    description: "Renting or leasing services involving commercial property",
    gstRate: 18,
    category: "Real Estate & Rent",
    details: "Commercial office spaces, shops, godown renting."
  },
  {
    code: "996331",
    type: "SAC",
    description: "Restaurant, cloud kitchen and takeaway food delivery services",
    gstRate: 5,
    category: "Food & Hospitality",
    details: "Standalone restaurants and cloud kitchens (without ITC); 5% GST."
  },
  {
    code: "996311",
    type: "SAC",
    description: "Hotel room accommodation services",
    gstRate: 12,
    category: "Food & Hospitality",
    details: "Room tariff up to ₹7,500/night attracts 12%; above attracts 18%."
  },
  {
    code: "996511",
    type: "SAC",
    description: "Goods transport agency (GTA) services by road",
    gstRate: 5,
    category: "Transport & Logistics",
    details: "5% under RCM (without ITC) or 12% under Forward Charge (with ITC)."
  },
  {
    code: "996812",
    type: "SAC",
    description: "Courier and express parcel delivery services",
    gstRate: 18,
    category: "Transport & Logistics",
    details: "Door-to-door courier, e-commerce shipment delivery."
  },

  // --- Electronics, IT Hardware & Appliances (HSN) ---
  {
    code: "8471",
    type: "HSN",
    description: "Computers, laptops, servers and data processing machines",
    gstRate: 18,
    category: "Electronics & Tech",
    details: "Personal computers, notebooks, servers, microprocessors."
  },
  {
    code: "8517",
    type: "HSN",
    description: "Smartphones, mobile phones and telecommunication apparatus",
    gstRate: 18,
    category: "Electronics & Tech",
    details: "Smartphones, cellular wireless devices, telephone sets."
  },
  {
    code: "8528",
    type: "HSN",
    description: "Monitors, television receivers and projectors",
    gstRate: 18,
    category: "Electronics & Tech",
    details: "Computer monitors up to 32 inches (18%); larger TVs may attract 28%."
  },
  {
    code: "8504",
    type: "HSN",
    description: "Electrical transformers, static converters (chargers, UPS) and inductors",
    gstRate: 18,
    category: "Electronics & Tech",
    details: "Mobile chargers, laptop adapters, power supply units."
  },
  {
    code: "8544",
    type: "HSN",
    description: "Insulated wire, cable and optical fiber cables",
    gstRate: 18,
    category: "Electricals & Wiring",
    details: "Copper wiring, Ethernet LAN cables, power cords."
  },

  // --- Textiles, Apparel & Footwear ---
  {
    code: "6109",
    type: "HSN",
    description: "T-shirts, singlets and other vests, knitted or crocheted",
    gstRate: 5,
    category: "Apparel & Textiles",
    details: "Cotton/synthetic T-shirts with sale value up to ₹1,000 attract 5%; > ₹1,000 attract 12%."
  },
  {
    code: "6203",
    type: "HSN",
    description: "Men's or boys' suits, jackets, blazers, trousers and shorts",
    gstRate: 12,
    category: "Apparel & Textiles",
    details: "Formal trousers, jeans, blazers, suits."
  },
  {
    code: "6403",
    type: "HSN",
    description: "Footwear with outer soles of rubber, plastics, leather",
    gstRate: 12,
    category: "Apparel & Textiles",
    details: "Shoes with sale value > ₹1,000 (12%); value <= ₹1,000 (5%)."
  },
  {
    code: "5208",
    type: "HSN",
    description: "Woven fabrics of cotton, containing 85% or more by weight of cotton",
    gstRate: 5,
    category: "Apparel & Textiles",
    details: "Pure cotton textile fabrics, grey cloth."
  },

  // --- FMCG, Food & Agriculture ---
  {
    code: "1006",
    type: "HSN",
    description: "Rice (pre-packaged and labeled vs loose)",
    gstRate: 5,
    category: "Food & Agriculture",
    details: "Pre-packaged and labeled rice attracts 5% GST; loose unbranded is 0% (exempt)."
  },
  {
    code: "0401",
    type: "HSN",
    description: "Milk and cream, not concentrated nor containing added sugar",
    gstRate: 0,
    category: "Food & Agriculture",
    details: "Fresh milk, pasteurized milk (exempt / 0% GST)."
  },
  {
    code: "0402",
    type: "HSN",
    description: "Milk powder, condensed milk, packaged paneer",
    gstRate: 5,
    category: "Food & Agriculture",
    details: "Packaged paneer, dairy whitener, condensed milk."
  },
  {
    code: "0902",
    type: "HSN",
    description: "Tea, whether or not flavored",
    gstRate: 5,
    category: "Food & Agriculture",
    details: "Black tea, green tea, CTC tea packets."
  },
  {
    code: "0901",
    type: "HSN",
    description: "Coffee, whether or not roasted or decaffeinated",
    gstRate: 5,
    category: "Food & Agriculture",
    details: "Roasted coffee beans, ground coffee."
  },
  {
    code: "1905",
    type: "HSN",
    description: "Bread, pastry, cakes, biscuits and other bakers' wares",
    gstRate: 18,
    category: "Food & Agriculture",
    details: "Packaged biscuits (18%), ordinary loaf bread (0% exempt)."
  },
  {
    code: "2201",
    type: "HSN",
    description: "Packaged drinking water, mineral water",
    gstRate: 18,
    category: "Food & Agriculture",
    details: "20-litre water jars, 1-litre packaged mineral water bottles."
  },

  // --- Healthcare & Pharma ---
  {
    code: "3004",
    type: "HSN",
    description: "Medicaments (medicines) consisting of mixed or unmixed products for therapeutic use",
    gstRate: 12,
    category: "Healthcare & Pharma",
    details: "Allopathic medicines, syrups, antibiotics, life-saving formulations."
  },
  {
    code: "3002",
    type: "HSN",
    description: "Human blood, vaccines, toxins, cultures of micro-organisms",
    gstRate: 5,
    category: "Healthcare & Pharma",
    details: "Vaccines, diagnostic testing kits."
  },
  {
    code: "9018",
    type: "HSN",
    description: "Medical, surgical, dental or veterinary instruments and appliances",
    gstRate: 12,
    category: "Healthcare & Pharma",
    details: "BP monitors, thermometers, syringes, surgical scalpels."
  },

  // --- Construction, Hardware & Building Materials ---
  {
    code: "2523",
    type: "HSN",
    description: "Portland cement, aluminous cement, slag cement and hydraulic cements",
    gstRate: 28,
    category: "Construction & Hardware",
    details: "Grey cement, white cement bags (highest 28% slab)."
  },
  {
    code: "7214",
    type: "HSN",
    description: "TMT steel bars, rods of iron or non-alloy steel",
    gstRate: 18,
    category: "Construction & Hardware",
    details: "TMT re-bars for building reinforcement."
  },
  {
    code: "6907",
    type: "HSN",
    description: "Ceramic flags and paving, hearth or wall tiles",
    gstRate: 18,
    category: "Construction & Hardware",
    details: "Vitrified floor tiles, glazed wall tiles."
  },
  {
    code: "3208",
    type: "HSN",
    description: "Paints and varnishes based on synthetic polymers",
    gstRate: 18,
    category: "Construction & Hardware",
    details: "Wall primers, emulsion paints, enamel paints."
  },

  // --- Automobiles, Auto Parts & Transport ---
  {
    code: "8708",
    type: "HSN",
    description: "Parts and accessories of motor vehicles",
    gstRate: 28,
    category: "Automobiles & Parts",
    details: "Car spare parts, brake pads, transmission components (28%)."
  },
  {
    code: "8711",
    type: "HSN",
    description: "Motorcycles (including mopeds) and cycles fitted with an auxiliary motor",
    gstRate: 28,
    category: "Automobiles & Parts",
    details: "Two-wheelers up to 350cc (28%); higher cc attracts compensation cess."
  },
  {
    code: "8703",
    type: "HSN",
    description: "Motor cars and other motor vehicles principally designed for transport of persons",
    gstRate: 28,
    category: "Automobiles & Parts",
    details: "Passenger vehicles attract 28% GST + applicable GST compensation cess (1% to 22%)."
  },
  {
    code: "4011",
    type: "HSN",
    description: "New pneumatic tyres, of rubber",
    gstRate: 28,
    category: "Automobiles & Parts",
    details: "Truck tyres, passenger car tyres, tractor rear tyres (18%)."
  },

  // --- Gems, Jewellery & Metals ---
  {
    code: "7113",
    type: "HSN",
    description: "Articles of jewellery and parts thereof, of precious metal",
    gstRate: 3,
    category: "Jewellery & Metals",
    details: "Gold, silver, platinum jewellery (special 3% GST slab; making charges attract 5%)."
  },
  {
    code: "7102",
    type: "HSN",
    description: "Diamonds, whether or not worked, but not mounted or set",
    gstRate: 1.5,
    category: "Jewellery & Metals",
    details: "Cut and polished diamonds (special 1.5% slab)."
  }
];

export function searchHsnSac(query: string, categoryFilter?: string): HsnSacItem[] {
  const q = query.trim().toLowerCase();
  return POPULAR_HSN_SAC_CODES.filter((item) => {
    const matchesCategory =
      !categoryFilter || categoryFilter === "All" || item.category === categoryFilter;
    if (!matchesCategory) return false;

    if (!q) return true;

    return (
      item.code.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.details && item.details.toLowerCase().includes(q))
    );
  });
}
