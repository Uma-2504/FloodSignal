import type { Incident, DashboardStats, DuplicateGroup } from '../types';

export const sampleIncidents: Incident[] = [
  {
    id: 'INC-001',
    reporterName: 'Rajesh Kumar',
    reporterPhone: '+91-9876543210',
    description:
      'T. Nagar Ranganathan Street முழுவதும் தண்ணீர் சூழ்ந்துள்ளது. கடைகளுக்குள் தண்ணீர் புகுந்துவிட்டது. மக்கள் மாடிக்கு சென்றுள்ளனர். உடனடி உதவி தேவை.',
    originalLanguage: 'tamil',
    translatedDescription:
      'Ranganathan Street in T. Nagar is completely submerged. Water has entered the shops. People have moved to upper floors. Immediate assistance required.',
    severity: 'critical',
    status: 'responding',
    location: {
      name: 'T. Nagar, Ranganathan Street',
      coordinates: { lat: 13.0418, lng: 80.2341 },
    },
    waterLevel: 6.5,
    reportedAt: '2026-11-03T06:15:00Z',
    updatedAt: '2026-11-03T07:45:00Z',
    duplicateGroupId: 'DG-001',
    mediaUrls: [
      'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=640',
      'https://images.unsplash.com/photo-1559060017-445fb9722f2a?w=640',
    ],
    aiSummary:
      'Critical flooding on Ranganathan Street, T. Nagar. Commercial area submerged at 6.5 ft. Civilians sheltering on upper floors. Priority evacuation recommended.',
  },
  {
    id: 'INC-002',
    reporterName: 'Priya Venkatesh',
    reporterPhone: '+91-9123456780',
    description:
      'Adyar river has overflowed near the bridge. The entire stretch from Adyar bridge to LB Road is under waist-deep water. Multiple cars are stranded and families are stuck inside homes near the riverbank.',
    originalLanguage: 'english',
    translatedDescription:
      'Adyar river has overflowed near the bridge. The entire stretch from Adyar bridge to LB Road is under waist-deep water. Multiple cars are stranded and families are stuck inside homes near the riverbank.',
    severity: 'critical',
    status: 'acknowledged',
    location: {
      name: 'Adyar, Near Adyar Bridge',
      coordinates: { lat: 13.0067, lng: 80.2563 },
    },
    waterLevel: 7.2,
    reportedAt: '2026-11-03T05:30:00Z',
    updatedAt: '2026-11-03T06:00:00Z',
    duplicateGroupId: 'DG-002',
    mediaUrls: [
      'https://images.unsplash.com/photo-1573167507387-6b4b98cb7c13?w=640',
    ],
    aiSummary:
      'Adyar River overflow near bridge. Water level 7.2 ft along LB Road corridor. Stranded vehicles and trapped residents reported. River breach situation.',
  },
  {
    id: 'INC-003',
    reporterName: 'Mohammed Farooq',
    reporterPhone: '+91-9988776655',
    description:
      'Velachery 100 feet road pe paani bhar gaya hai. Ambulance aur fire truck nahi aa pa rahe. Ek pregnant lady ko hospital le jaana hai urgently. Koi help bhejo please.',
    originalLanguage: 'hindi',
    translatedDescription:
      'Velachery 100 Feet Road is waterlogged. Ambulances and fire trucks cannot reach the area. A pregnant woman needs to be taken to the hospital urgently. Please send help.',
    severity: 'critical',
    status: 'new',
    location: {
      name: 'Velachery, 100 Feet Road',
      coordinates: { lat: 12.9815, lng: 80.2180 },
    },
    waterLevel: 5.8,
    reportedAt: '2026-11-04T02:20:00Z',
    updatedAt: '2026-11-04T02:20:00Z',
    mediaUrls: [],
    aiSummary:
      'Medical emergency in Velachery. Pregnant woman requires hospital transport. 100 Feet Road impassable at 5.8 ft water level. Emergency vehicle access blocked.',
  },
  {
    id: 'INC-004',
    reporterName: 'Surya Prakash',
    reporterPhone: '+91-8877665544',
    description:
      'Tambaram railway station area la water level romba increase aayiruchu. Train tracks full ah submerge aayiruchu. Station la around 200 passengers stranded aayirukanga. Food and water shortage iruku.',
    originalLanguage: 'tanglish',
    translatedDescription:
      'Water level has increased significantly in the Tambaram railway station area. Train tracks are fully submerged. Around 200 passengers are stranded at the station. There is a food and water shortage.',
    severity: 'high',
    status: 'responding',
    location: {
      name: 'Tambaram, Railway Station',
      coordinates: { lat: 12.9249, lng: 80.1278 },
    },
    waterLevel: 4.5,
    reportedAt: '2026-11-03T08:00:00Z',
    updatedAt: '2026-11-03T10:30:00Z',
    mediaUrls: [
      'https://images.unsplash.com/photo-1600336153113-d66c79de46e2?w=640',
    ],
    aiSummary:
      'Tambaram railway station flooded at 4.5 ft. ~200 passengers stranded. Rail operations halted. Food/water supplies running low. Relief supplies needed.',
  },
  {
    id: 'INC-005',
    reporterName: 'Lakshmi Narayanan',
    reporterPhone: '+91-7766554433',
    description:
      'Kodambakkam high road and surrounding lanes are flooded. The underground drainage system seems completely choked. Sewage water is mixing with rainwater and there is a terrible stench. Children in the area are falling sick.',
    originalLanguage: 'english',
    translatedDescription:
      'Kodambakkam high road and surrounding lanes are flooded. The underground drainage system seems completely choked. Sewage water is mixing with rainwater and there is a terrible stench. Children in the area are falling sick.',
    severity: 'high',
    status: 'acknowledged',
    location: {
      name: 'Kodambakkam, High Road',
      coordinates: { lat: 13.0524, lng: 80.2255 },
    },
    waterLevel: 3.8,
    reportedAt: '2026-11-03T14:45:00Z',
    updatedAt: '2026-11-03T15:30:00Z',
    mediaUrls: [
      'https://images.unsplash.com/photo-1590686411588-b983e3279979?w=640',
    ],
    aiSummary:
      'Sewage-contaminated flooding on Kodambakkam High Road. Drainage failure reported. Public health risk — children falling ill. Sanitation crew and medical team required.',
  },
  {
    id: 'INC-006',
    reporterName: 'Anitha Sundaram',
    reporterPhone: '+91-9443216789',
    description:
      'Anna Nagar 2nd Avenue la oru old age home iruku. Anga 15 elderly people stuck aayirukanga. Ground floor full ah water vanthuruchu. Current poyiruchu. Generator um illa. Yaraavathu help pannunga.',
    originalLanguage: 'tanglish',
    translatedDescription:
      'There is an old age home on Anna Nagar 2nd Avenue. 15 elderly people are stuck there. The ground floor is fully flooded. Power has gone out. There is no generator either. Someone please help.',
    severity: 'critical',
    status: 'responding',
    location: {
      name: 'Anna Nagar, 2nd Avenue',
      coordinates: { lat: 13.0850, lng: 80.2101 },
    },
    waterLevel: 4.2,
    reportedAt: '2026-11-03T22:10:00Z',
    updatedAt: '2026-11-04T01:15:00Z',
    mediaUrls: [],
    aiSummary:
      'Elderly care facility in Anna Nagar at risk. 15 senior citizens trapped, ground floor submerged at 4.2 ft. No power or backup generator. Vulnerable population — priority rescue.',
  },
  {
    id: 'INC-007',
    reporterName: 'Deepak Rajan',
    reporterPhone: '+91-9551234567',
    description:
      'Perungudi IT corridor backside residential area fully flooded. The lake near Perungudi has breached. Water flowing rapidly into Thoraipakkam and surrounding areas. Many ground floor apartments are submerged.',
    originalLanguage: 'english',
    translatedDescription:
      'Perungudi IT corridor backside residential area fully flooded. The lake near Perungudi has breached. Water flowing rapidly into Thoraipakkam and surrounding areas. Many ground floor apartments are submerged.',
    severity: 'high',
    status: 'new',
    location: {
      name: 'Perungudi, IT Corridor',
      coordinates: { lat: 12.9610, lng: 80.2437 },
    },
    waterLevel: 5.0,
    reportedAt: '2026-11-04T04:30:00Z',
    updatedAt: '2026-11-04T04:30:00Z',
    duplicateGroupId: 'DG-003',
    mediaUrls: [
      'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=640',
      'https://images.unsplash.com/photo-1559060017-445fb9722f2a?w=640',
    ],
    aiSummary:
      'Lake breach near Perungudi causing rapid flooding in IT corridor residential zone. 5 ft water level. Ground floor apartments submerged. Expanding toward Thoraipakkam.',
  },
  {
    id: 'INC-008',
    reporterName: 'Kavitha Mohan',
    reporterPhone: '+91-8899001122',
    description:
      'Sholinganallur junction la signal post விழுந்துவிட்டது. மின்சார கம்பி தண்ணீரில் விழுந்துள்ளது. Electrocution danger இருக்கு. Yaarum antha side la pogaathinga.',
    originalLanguage: 'tanglish',
    translatedDescription:
      'A signal post has fallen at Sholinganallur junction. An electric wire has fallen into the water. There is a danger of electrocution. Nobody should go to that side.',
    severity: 'critical',
    status: 'acknowledged',
    location: {
      name: 'Sholinganallur, Junction',
      coordinates: { lat: 12.9010, lng: 80.2279 },
    },
    waterLevel: 3.2,
    reportedAt: '2026-11-04T03:00:00Z',
    updatedAt: '2026-11-04T03:45:00Z',
    mediaUrls: [
      'https://images.unsplash.com/photo-1600336153113-d66c79de46e2?w=640',
    ],
    aiSummary:
      'Electrocution hazard at Sholinganallur junction. Downed power lines in floodwater. Immediate area cordoning and TANGEDCO response needed. Public safety alert issued.',
  },
  {
    id: 'INC-009',
    reporterName: 'Arun Balaji',
    reporterPhone: '+91-9667788990',
    description:
      'Guindy National Park ke paas wali residential colony mein paani ghus gaya hai. Kaafi saanp aur keede makode dikh rahe hain paani ke saath. Bacchon ko safe jagah le jaana zaroori hai.',
    originalLanguage: 'hindi',
    translatedDescription:
      'Water has entered the residential colony near Guindy National Park. Many snakes and insects are being seen along with the water. It is essential to take children to a safe place.',
    severity: 'medium',
    status: 'acknowledged',
    location: {
      name: 'Guindy, Near National Park',
      coordinates: { lat: 13.0067, lng: 80.2206 },
    },
    waterLevel: 2.8,
    reportedAt: '2026-11-03T18:00:00Z',
    updatedAt: '2026-11-03T19:00:00Z',
    mediaUrls: [],
    aiSummary:
      'Moderate flooding near Guindy National Park. Wildlife intrusion reported — snakes and insects entering homes. Child safety concern. Animal control and evacuation advisory recommended.',
  },
  {
    id: 'INC-010',
    reporterName: 'Meenakshi Raman',
    reporterPhone: '+91-9445566778',
    description:
      'Mylapore Kapaleeshwarar temple பகுதியில் தெருக்கள் முழுவதும் தண்ணீர். கோயிலுக்கு செல்ல முடியவில்லை. பல வயதானவர்கள் வீடுகளில் சிக்கியுள்ளனர். மருந்துகள் தேவைப்படுகிறது.',
    originalLanguage: 'tamil',
    translatedDescription:
      'Streets around the Kapaleeshwarar temple area in Mylapore are fully waterlogged. Unable to reach the temple. Many elderly people are stuck in their homes. Medicines are needed.',
    severity: 'medium',
    status: 'responding',
    location: {
      name: 'Mylapore, Near Kapaleeshwarar Temple',
      coordinates: { lat: 13.0339, lng: 80.2692 },
    },
    waterLevel: 3.0,
    reportedAt: '2026-11-03T11:30:00Z',
    updatedAt: '2026-11-03T13:00:00Z',
    mediaUrls: [
      'https://images.unsplash.com/photo-1573167507387-6b4b98cb7c13?w=640',
    ],
    aiSummary:
      'Mylapore temple area streets flooded at 3 ft. Elderly residents homebound and in need of medication. Medical supply delivery and welfare check required.',
  },
  {
    id: 'INC-011',
    reporterName: 'Ganesh Subramanian',
    reporterPhone: '+91-7788990011',
    description:
      'Chromepet bus stand area la water slowly increase aaguthu. Morning la 1 feet iruntha ippo 3 feet aayiruchu. Buses ellam cancel aayiruchu. Office ku poga mudiyala. Drainage clean pannanum.',
    originalLanguage: 'tanglish',
    translatedDescription:
      'Water is slowly increasing in the Chromepet bus stand area. It was 1 foot in the morning and has now reached 3 feet. All buses have been cancelled. Unable to go to office. Drainage needs to be cleaned.',
    severity: 'medium',
    status: 'new',
    location: {
      name: 'Chromepet, Bus Stand',
      coordinates: { lat: 12.9516, lng: 80.1443 },
    },
    waterLevel: 3.0,
    reportedAt: '2026-11-04T06:00:00Z',
    updatedAt: '2026-11-04T06:00:00Z',
    mediaUrls: [],
    aiSummary:
      'Rising water levels at Chromepet bus stand — 1 ft to 3 ft in 6 hours. Public transit halted. Drainage blockage suspected. Monitoring for escalation recommended.',
  },
  {
    id: 'INC-012',
    reporterName: 'Shalini Krishnan',
    reporterPhone: '+91-9334455667',
    description:
      'Porur lake has started overflowing again like 2015. Water entering Ramapuram and Valasaravakkam areas. Many families are evacuating on their own. Government boats are needed for elderly and disabled people who cannot move.',
    originalLanguage: 'english',
    translatedDescription:
      'Porur lake has started overflowing again like 2015. Water entering Ramapuram and Valasaravakkam areas. Many families are evacuating on their own. Government boats are needed for elderly and disabled people who cannot move.',
    severity: 'high',
    status: 'responding',
    location: {
      name: 'Porur, Near Porur Lake',
      coordinates: { lat: 13.0382, lng: 80.1582 },
    },
    waterLevel: 5.5,
    reportedAt: '2026-11-03T16:30:00Z',
    updatedAt: '2026-11-03T20:00:00Z',
    mediaUrls: [
      'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=640',
    ],
    aiSummary:
      'Porur Lake overflow — situation paralleling 2015 floods. Water spreading to Ramapuram and Valasaravakkam. Self-evacuation in progress. Boat rescue needed for mobility-impaired residents.',
  },
  {
    id: 'INC-013',
    reporterName: 'Karthik Ramachandran',
    reporterPhone: '+91-9001122334',
    description:
      'T. Nagar Pondy Bazaar side la road full ah water. Underground parking la cars ellam moozhgi pochu. Oru car la baby seat iruku — owner ku contact aagala. Please check pannunga.',
    originalLanguage: 'tanglish',
    translatedDescription:
      'Pondy Bazaar side of T. Nagar road is fully waterlogged. Cars in the underground parking are all submerged. There is a baby seat in one car — unable to contact the owner. Please check.',
    severity: 'high',
    status: 'new',
    location: {
      name: 'T. Nagar, Pondy Bazaar',
      coordinates: { lat: 13.0470, lng: 80.2340 },
    },
    waterLevel: 5.8,
    reportedAt: '2026-11-04T05:15:00Z',
    updatedAt: '2026-11-04T05:15:00Z',
    duplicateGroupId: 'DG-001',
    mediaUrls: [
      'https://images.unsplash.com/photo-1590686411588-b983e3279979?w=640',
    ],
    aiSummary:
      'Underground parking submerged at T. Nagar Pondy Bazaar. Vehicles flooded. Unverified concern about child safety in parked vehicle. Urgent on-site verification needed.',
  },
  {
    id: 'INC-014',
    reporterName: 'Fatima Begum',
    reporterPhone: '+91-8112233445',
    description:
      'Adyar LB Road pe building ke basement mein paani bhar gaya. Generator aur electrical panel doob gaye hain. 3 floors ke logon ka power cut ho gaya. Ek dialysis patient hai jo machine pe depend karta hai.',
    originalLanguage: 'hindi',
    translatedDescription:
      'The basement of a building on Adyar LB Road is flooded. The generator and electrical panel are submerged. Power is cut for people on 3 floors. There is a dialysis patient who depends on a machine.',
    severity: 'critical',
    status: 'new',
    location: {
      name: 'Adyar, LB Road',
      coordinates: { lat: 13.0053, lng: 80.2586 },
    },
    waterLevel: 8.0,
    reportedAt: '2026-11-04T07:00:00Z',
    updatedAt: '2026-11-04T07:00:00Z',
    duplicateGroupId: 'DG-002',
    mediaUrls: [],
    aiSummary:
      'Life-threatening situation on LB Road, Adyar. Basement flooding at 8 ft destroyed backup power. Dialysis-dependent patient without electricity. Immediate medical evacuation critical.',
  },
  {
    id: 'INC-015',
    reporterName: 'Vivek Shankar',
    reporterPhone: '+91-9778899001',
    description:
      'Perungudi OMR service road completely flooded. IT companies have water inside ground floor lobbies. Thousands of employees stuck in office buildings since last night. Food supplies running out in the cafeterias.',
    originalLanguage: 'english',
    translatedDescription:
      'Perungudi OMR service road completely flooded. IT companies have water inside ground floor lobbies. Thousands of employees stuck in office buildings since last night. Food supplies running out in the cafeterias.',
    severity: 'high',
    status: 'acknowledged',
    location: {
      name: 'Perungudi, OMR Service Road',
      coordinates: { lat: 12.9630, lng: 80.2410 },
    },
    waterLevel: 4.5,
    reportedAt: '2026-11-04T01:00:00Z',
    updatedAt: '2026-11-04T05:00:00Z',
    duplicateGroupId: 'DG-003',
    mediaUrls: [
      'https://images.unsplash.com/photo-1573167507387-6b4b98cb7c13?w=640',
      'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=640',
    ],
    aiSummary:
      'OMR IT corridor in Perungudi flooded. Thousands of employees stranded overnight in office buildings. Food shortage reported. Mass evacuation or supply drop needed.',
  },
  {
    id: 'INC-016',
    reporterName: 'Nalini Devi',
    reporterPhone: '+91-9556677889',
    description:
      'Velachery Phoenix mall பின்புறம் உள்ள குடியிருப்புப் பகுதியில் தண்ணீர் வடிவதில்லை. இரண்டு நாட்களாக தண்ணீர் தேங்கியுள்ளது. கொசுக்கள் மிகவும் அதிகமாக உள்ளன. டெங்கு பரவும் அபாயம்.',
    originalLanguage: 'tamil',
    translatedDescription:
      'Water is not draining in the residential area behind Phoenix Mall, Velachery. Water has been stagnant for two days. Mosquitoes are extremely high. There is a risk of dengue spreading.',
    severity: 'low',
    status: 'new',
    location: {
      name: 'Velachery, Behind Phoenix Mall',
      coordinates: { lat: 12.9828, lng: 80.2175 },
    },
    waterLevel: 1.5,
    reportedAt: '2026-11-04T08:00:00Z',
    updatedAt: '2026-11-04T08:00:00Z',
    mediaUrls: [],
    aiSummary:
      'Stagnant water for 2 days behind Phoenix Mall, Velachery. Low water level but high mosquito density. Dengue outbreak risk. Public health intervention and drainage clearance needed.',
  },
  {
    id: 'INC-017',
    reporterName: 'Ramesh Babu',
    reporterPhone: '+91-9887766554',
    description:
      'Anna Nagar tower park area la manhole covers ellam open aayiruchu. Oru biker already manhole la vizhunthu injury aayiruchu. Night la romba dangerous. Barricade podanum.',
    originalLanguage: 'tanglish',
    translatedDescription:
      'All manhole covers in the Anna Nagar Tower Park area have opened. A biker has already fallen into a manhole and got injured. It is very dangerous at night. Barricades need to be placed.',
    severity: 'medium',
    status: 'resolved',
    location: {
      name: 'Anna Nagar, Tower Park',
      coordinates: { lat: 13.0878, lng: 80.2089 },
    },
    waterLevel: 2.0,
    reportedAt: '2026-11-02T20:00:00Z',
    updatedAt: '2026-11-03T09:00:00Z',
    mediaUrls: [
      'https://images.unsplash.com/photo-1600336153113-d66c79de46e2?w=640',
    ],
    aiSummary:
      'Open manholes in Anna Nagar Tower Park area. One biker injured. Barricades placed and manholes secured. Incident resolved.',
  },
  {
    id: 'INC-018',
    reporterName: 'Sundar Pichai',
    reporterPhone: '+91-9112233440',
    description:
      'Guindy industrial estate mein factory ka chemical storage room mein paani ghus gaya hai. Chemical drums tilt ho gaye hain. Agar chemical leak hua toh bahut bada hazard ho sakta hai. Fire department ko bulao.',
    originalLanguage: 'hindi',
    translatedDescription:
      'Water has entered the chemical storage room of a factory in Guindy Industrial Estate. Chemical drums have tilted. If chemicals leak, it could be a major hazard. Call the fire department.',
    severity: 'high',
    status: 'responding',
    location: {
      name: 'Guindy, Industrial Estate',
      coordinates: { lat: 13.0120, lng: 80.2130 },
    },
    waterLevel: 3.5,
    reportedAt: '2026-11-03T23:30:00Z',
    updatedAt: '2026-11-04T02:00:00Z',
    mediaUrls: [],
    aiSummary:
      'Chemical hazard risk at Guindy Industrial Estate. Floodwater in storage room, drums destabilized. Potential chemical spill. HazMat and fire department response in progress.',
  },
  {
    id: 'INC-019',
    reporterName: 'Divya Prakash',
    reporterPhone: '+91-9009988776',
    description:
      'Chromepet GSTroad side la oru school building la around 50 people shelter eduthurukanga. But food illa, drinking water illa. Current um poyiruchu. Babies and small children irukanga. Milk and diapers urgently venum.',
    originalLanguage: 'tanglish',
    translatedDescription:
      'Around 50 people have taken shelter in a school building on GST Road side of Chromepet. But there is no food, no drinking water. Power is also gone. There are babies and small children. Milk and diapers are urgently needed.',
    severity: 'high',
    status: 'new',
    location: {
      name: 'Chromepet, GST Road',
      coordinates: { lat: 12.9480, lng: 80.1420 },
    },
    waterLevel: 3.8,
    reportedAt: '2026-11-04T09:00:00Z',
    updatedAt: '2026-11-04T09:00:00Z',
    mediaUrls: [],
    aiSummary:
      'Makeshift shelter at Chromepet school housing ~50 displaced persons including infants. No food, water, or power. Urgent supply delivery needed — milk, diapers, drinking water, food packets.',
  },
  {
    id: 'INC-020',
    reporterName: 'Bala Murugan',
    reporterPhone: '+91-9665544332',
    description:
      'Porur Kundrathur road la bridge oru side crack aayiruchu. Heavy vehicles pogathenga. Water flow bridge ku adiyil romba heavy ah iruku. Bridge collapse aagum pola theriyuthu.',
    originalLanguage: 'tanglish',
    translatedDescription:
      'The bridge on Porur Kundrathur Road has cracked on one side. Heavy vehicles should not go. Water flow under the bridge is very heavy. It looks like the bridge might collapse.',
    severity: 'critical',
    status: 'acknowledged',
    location: {
      name: 'Porur, Kundrathur Road Bridge',
      coordinates: { lat: 13.0350, lng: 80.1490 },
    },
    waterLevel: 6.0,
    reportedAt: '2026-11-04T04:00:00Z',
    updatedAt: '2026-11-04T05:30:00Z',
    mediaUrls: [
      'https://images.unsplash.com/photo-1590686411588-b983e3279979?w=640',
    ],
    aiSummary:
      'Structural damage to Porur-Kundrathur Road bridge. Visible cracking and heavy water pressure underneath. Bridge collapse risk. Immediate closure to heavy vehicles and structural inspection required.',
  },
];

export const sampleDashboardStats: DashboardStats = {
  totalIncidents: 20,
  criticalIncidents: 6,
  activeResponses: 7,
  resolvedIncidents: 1,
  averageResponseTime: '42 mins',
  incidentsToday: 9,
};

export const sampleDuplicateGroups: DuplicateGroup[] = [
  {
    id: 'DG-001',
    incidentIds: ['INC-001', 'INC-013'],
    primaryIncidentId: 'INC-001',
    mergedDescription:
      'Multiple reports of severe flooding across T. Nagar area including Ranganathan Street and Pondy Bazaar. Commercial establishments submerged, underground parking lots flooded, and residents sheltering on upper floors. Water level approximately 5.8–6.5 feet.',
    location: {
      name: 'T. Nagar (Multiple Locations)',
      coordinates: { lat: 13.0440, lng: 80.2341 },
    },
  },
  {
    id: 'DG-002',
    incidentIds: ['INC-002', 'INC-014'],
    primaryIncidentId: 'INC-002',
    mergedDescription:
      'Adyar River overflow causing cascading flooding along LB Road corridor. Bridge area to residential buildings affected. Critical situation with stranded vehicles, trapped residents, and a dialysis-dependent patient without power. Water level 7.2–8.0 feet.',
    location: {
      name: 'Adyar, LB Road Corridor',
      coordinates: { lat: 13.0060, lng: 80.2575 },
    },
  },
  {
    id: 'DG-003',
    incidentIds: ['INC-007', 'INC-015'],
    primaryIncidentId: 'INC-007',
    mergedDescription:
      'Perungudi area experiencing widespread flooding from lake breach to OMR IT corridor. Residential apartments submerged and thousands of IT employees stranded in office buildings overnight. Food supply shortage developing. Water level 4.5–5.0 feet.',
    location: {
      name: 'Perungudi, IT Corridor & Residential',
      coordinates: { lat: 12.9620, lng: 80.2425 },
    },
  },
];
