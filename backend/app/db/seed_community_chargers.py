"""Pre-seed 150+ synthetic/dummy community home EV chargers across Kerala."""

from typing import List, Dict, Any
import random
from sqlalchemy.orm import Session
from backend.app.db.models import CommunityCharger
from backend.app.ingestion.h3_indexer import H3SpatialIndexer

# Standard fixed community EV tariff in Kerala (Residential green tariff)
STANDARD_COMMUNITY_PRICE_PER_KWH = 11.50

# Kerala District Hubs with base coordinates and authentic neighborhoods
KERALA_HUBS = [
    # 1. Ernakulam / Kochi Corridor (26 chargers)
    {
        "city": "Chalakudy",
        "district": "Thrissur",
        "coords": [
            (10.3065, 76.3385, "NH-544 Bypass Road", "Mathew Kurian", "Fast 7.4kW Point"),
            (10.3210, 76.3355, "Potta Junction", "Ananya Nair", "Solar Home EV Station"),
            (10.2980, 76.3340, "South Chalakudy Rosewood", "Dr. Joseph Varghese", "Driveway Wallbox"),
            (10.3150, 76.3450, "Koodapuzha Riverside", "Sreejith Menon", "Riverside Green Plug"),
            (10.3280, 76.3290, "Muringoor West", "Philomina David", "Highway Halt Wallbox"),
        ],
    },
    {
        "city": "Kochi",
        "district": "Ernakulam",
        "coords": [
            (9.9816, 76.2999, "Kaloor Stadium Link Rd", "Siddharth Shenoy", "Stadium Metro Wallbox"),
            (10.0261, 76.3125, "Edappally Toll Tollgate", "Harikrishnan Pillai", "Lulu Corridor Point"),
            (10.0158, 76.3419, "Kakkanad Infopark Phase 1", "Arun Chandran", "Techie Solar Hub"),
            (10.0080, 76.3550, "Infopark Phase 2 Smart City", "Deepa Nambiar", "SmartCity Driveway EV"),
            (9.9312, 76.2673, "Fort Kochi Princess St", "Kevin D'Silva", "Heritage Villa Charger"),
            (9.9700, 76.3180, "Vyttila Mobility Hub West", "Paulson George", "Hub Transit Fast AC"),
            (9.9450, 76.3350, "Tripunithura Statue Junction", "Radhika Varma", "Palace Town Wallbox"),
            (10.0520, 76.3380, "Kalamassery Premier Junction", "Niyas Hameed", "Premier Fast AC Point"),
            (10.0710, 76.3320, "HMT Colony Kalamassery", "Gireesh Kumar", "HMT Green Drive"),
            (10.1076, 76.3516, "Aluva Palace Road", "Faisal Rahman", "Periyar View Point"),
            (10.1150, 76.3420, "Aluva Bank Junction", "Kavitha Rajan", "Metro End Wallbox"),
            (10.1980, 76.3850, "Angamaly KSRTC North", "Devadas K.", "Airport Highway Halt"),
            (10.1550, 76.3980, "Nedumbassery Airport Vathakkad", "Antony George", "Airport Eco Villa"),
            (10.1380, 76.4720, "Perumbavoor AM Road", "Shaji Varghese", "Timber City Wallbox"),
            (9.9880, 76.5780, "Muvattupuzha Post Office Rd", "Biju Mathew", "Three Rivers Plug"),
            (10.0600, 76.6250, "Kothamangalam High Range Rd", "Joby Thomas", "Highrange Gateway"),
            (9.9550, 76.2890, "Thevara Ferry Junction", "Thomas Kuruvilla", "Waterfront AC Station"),
            (9.9920, 76.3580, "Palarivattom Pipeline Rd", "Reena Jacob", "Pipeline City Wallbox"),
            (10.0380, 76.3290, "Thrikkakara Temple Rd", "Narayanan Kutty", "University Colony EV"),
            (9.9720, 76.2850, "Panampilly Nagar Main", "Vivek V.", "Boutique Green Charger"),
            (10.0010, 76.3050, "Elamakkara Church Rd", "Pramod Das", "Suburban Oasis EV"),
        ],
    },
    # 2. Thrissur Corridor (18 chargers)
    {
        "city": "Thrissur",
        "district": "Thrissur",
        "coords": [
            (10.5276, 76.2144, "Round North Swaraj Round", "Gopalakrishnan Nair", "Swaraj Round Villa"),
            (10.5120, 76.2230, "Kuriachira St. Pauls", "Davis C.L.", "Kuriachira AC Point"),
            (10.4850, 76.2410, "Ollur Church Circle", "Johny Rappai", "Ollur Highway Halt"),
            (10.3680, 76.3120, "Kodakara NH-544 Bypass", "Subramanian P.", "Kodakara Tollway EV"),
            (10.3550, 76.2020, "Irinjalakuda Koodalmanikyam", "Unnikrishnan K.", "Temple Town Charger"),
            (10.5950, 76.0420, "Guruvayur East Nada", "Kesavan Namboodiri", "Pilgrim Heritage EV"),
            (10.6220, 76.0750, "Kunnamkulam Main Road", "Sunny V.", "North Hub Wallbox"),
            (10.6010, 76.2180, "Wadakkanchery Ottupara", "Prabhakaran K.", "Valley Green Plug"),
            (10.5420, 76.1950, "Ayyanthole Civil Station", "Adv. Suresh Kumar", "Court Complex Wallbox"),
            (10.5520, 76.2380, "Mannuthy Agriculture Univ", "Prof. K.R. Menon", "Agri Campus Green"),
            (10.5310, 76.2650, "Pottore Kolazhy", "Balachandran T.", "Kolazhy Green Nest"),
            (10.4520, 76.2890, "Pudukkad Railway Station Rd", "Francis Xavier", "Pudukkad Express EV"),
            (10.5780, 76.2080, "Punkunnam Ramdas Nagar", "Venkatesh Iyer", "Punkunnam Heritage"),
            (10.4120, 76.1550, "Cherpu Thayamkulangara", "Ramanathan M.", "Melam Village EV"),
            (10.5010, 76.1820, "Kanjany Road Olari", "Shyam Mohan", "Olari Sunset Wallbox"),
        ],
    },
    # 3. Thiruvananthapuram (20 chargers)
    {
        "city": "Thiruvananthapuram",
        "district": "Thiruvananthapuram",
        "coords": [
            (8.5580, 76.8810, "Kazhakkoottam Technopark Gate 1", "Vishnu Prasad", "Technopark Eco Wallbox"),
            (8.5680, 76.8720, "Technopark Phase 3 Karyavattom", "Akhil Mohan", "Campus Green Station"),
            (8.5241, 76.9366, "Kowdiar Palace Avenue", "Rajesh Pillai", "Palace View EV Port"),
            (8.5150, 76.9450, "Vazhuthacaud DPI Junction", "Geetha Kumari", "DPI Green Charger"),
            (8.5320, 76.9380, "Pattom Plamoodu", "Madhavan Unni", "Pattom Central EV"),
            (8.4820, 76.9580, "Nemom Pravachambalam", "Sukumaran Nair", "South Bypass Halt"),
            (8.4020, 77.0250, "Neyyattinkara Hospital Rd", "Dr. Aravind S.", "Amaravila Highway EV"),
            (8.6950, 76.8150, "Attingal KSRTC Bypass", "Manoj K.", "Attingal Express Wallbox"),
            (8.7380, 76.7160, "Varkala Cliff Helipad", "Liam Thomas", "Cliffside Coastal EV"),
            (8.5820, 76.9950, "Nedumangad Pazhakutti", "Surendran B.", "Foothills Green Point"),
            (8.5080, 76.9720, "Poojappura Mandapam", "Ramesh Chandran", "Poojappura Heritage EV"),
            (8.4910, 76.9420, "Manacaud Fort West", "Abdul Salam", "Old City Driveway"),
            (8.5280, 76.9120, "Kumarapuram Medical College", "Dr. Latha R.", "MedCity Fast AC"),
            (8.5450, 76.9020, "Ulloor Akkulam Lake", "Jacob Chacko", "Lakeside Wallbox"),
            (8.5620, 76.8920, "Sreekaryam Pangappara", "Gopakumar V.", "Highway Green Point"),
            (8.3950, 76.9820, "Balaramapuram Handloom St", "Krishnan Kutty", "Weavers Town EV"),
            (8.6010, 76.8550, "Pothencode Santhigiri", "Shaji Kumar", "Pothencode Eco Plug"),
            (8.4720, 76.9850, "Thiruvallam Parasurama", "Sasidharan K.", "Riverside Heritage"),
        ],
    },
    # 4. Kozhikode / Calicut Corridor (16 chargers)
    {
        "city": "Kozhikode",
        "district": "Kozhikode",
        "coords": [
            (11.2588, 75.7804, "Calicut Beach Gujarati St", "Abdulla Koya", "Beachside Solar EV"),
            (11.2650, 75.7950, "Mavoor Road Arayidathupalam", "Rasheed Ahmed", "Mavoor Corridor AC"),
            (11.2720, 75.8350, "Medical College Kovoor", "Dr. Manoj P.", "Medicos Eco Point"),
            (11.1620, 75.8580, "Feroke Bridge South", "Basheer M.", "Chaliyar Riverfront EV"),
            (11.6050, 75.5920, "Vadakara Link Road", "Vijayan Nambiar", "Vadakara Express AC"),
            (11.4420, 75.7010, "Koyilandy Bypass", "Sathyan K.", "Coastal Highway Plug"),
            (11.2950, 75.8050, "Nadakkavu West Hill", "Sujith Nair", "West Hill Green Nest"),
            (11.2820, 75.8450, "Chevayur CWRDM Road", "Narayanan E.", "CWRDM Green Point"),
            (11.3120, 75.7720, "Elathur Korapuzha Bridge", "Damodaran K.", "Korapuzha View EV"),
            (11.3350, 75.8820, "Kunnamangalam IIM Way", "Prof. V. Sharma", "IIM Road Solar Hub"),
            (11.2380, 75.8050, "Meenchanda Arts College", "Sudheer Babu", "South Calicut Wallbox"),
            (11.2150, 75.8320, "Pantheeramkavu Bypass", "Ashraf Ali", "NH-66 Junction EV"),
            (11.3850, 75.6720, "Thikkodi Drive-in Beach", "Musthafa C.", "Drive-in Coast Charger"),
            (11.1950, 75.8850, "Ramanattukara Airport Link", "Haneefa P.", "Airport Bypass Point"),
        ],
    },
    # 5. Palakkad Corridor (14 chargers)
    {
        "city": "Palakkad",
        "district": "Palakkad",
        "coords": [
            (10.7867, 76.6548, "Palakkad Fort Maidan", "Sankaranarayanan", "Fortview Solar EV"),
            (10.7720, 76.6450, "Chandranagar NH-544 Colony", "Ganesh Murthy", "Chandranagar Express"),
            (10.7680, 76.2820, "Ottapalam Cinema Road", "Venugopal K.", "Valluvanad Wallbox"),
            (10.7620, 76.2750, "Shoranur Kulappully Jn", "Muraleedharan", "Railway Junction EV"),
            (10.6450, 76.5420, "Alathur Swathi Nagar", "Raman Nair", "Gayathripuzha Point"),
            (10.6850, 76.7150, "Chittur College Road", "Subhashini M.", "Chitturpuzha AC Port"),
            (10.7950, 76.6850, "Kanjikode Industrial Park", "Rangarajan S.", "Kanjikode Fast AC"),
            (10.8250, 76.4950, "Mundur Kongad Road", "Ayyappan K.", "North Palakkad Wallbox"),
            (10.7350, 76.4150, "Pathiripala Nagar", "Gopinathan P.", "Bharathapuzha Green"),
            (10.6120, 76.4550, "Vadakkencherry NH-544 Halt", "Mathew P.J.", "Highroad Oasis Wallbox"),
            (10.7510, 76.6120, "Pirayiri Olavakode", "Sundaram Iyer", "Railway Colony EV"),
            (10.8450, 76.7450, "Walayar Border Post", "Senthil Kumar", "Border Gateway EV"),
        ],
    },
    # 6. Malappuram (14 chargers)
    {
        "city": "Malappuram",
        "district": "Malappuram",
        "coords": [
            (11.0735, 76.0740, "Up Hill Civil Station", "Kunjahammed Haji", "Up Hill Green Plug"),
            (11.1210, 76.1220, "Manjeri Court Road", "Adv. Faisal Babu", "Manjeri Town Wallbox"),
            (10.9150, 75.9250, "Tirur Thazheppalam", "Hamza Koya", "Thunchan Coast EV"),
            (10.9850, 76.2250, "Perinthalmanna Bypass", "Dr. Noushad P.", "Hospital City Wallbox"),
            (11.0020, 75.9980, "Kottakkal Arya Vaidya Sala", "Madhavankutty", "Ayur City Eco Point"),
            (10.7850, 75.9850, "Edappal Kuttipuram Bridge", "Santhosh Kumar", "Riverbank AC Station"),
            (11.0250, 76.1550, "Malappuram Down Hill", "Sulaiman M.", "Downhill Express EV"),
            (10.9420, 75.8750, "Tanur Harbor Link", "Bichu K.", "Coastal Harbor Plug"),
            (11.1550, 75.9550, "Kondotty Airport Road", "Aboobacker Siddique", "Aerotown Fast AC"),
            (11.0950, 76.2950, "Nilambur Teak Forest Rd", "Georgekutty V.", "Teak Valley Green EV"),
            (10.8250, 76.0450, "Ponnani Port Road", "Iqbal K.", "Port Town Harbor EV"),
            (10.8920, 76.1520, "Valanchery NH-66 Jn", "Siddique Hassan", "Highroad Valley Halt"),
        ],
    },
    # 7. Kottayam (14 chargers)
    {
        "city": "Kottayam",
        "district": "Kottayam",
        "coords": [
            (9.5916, 76.5222, "Collectorate Kanjikuzhy", "Thomas Mathew", "Kanjikuzhy Solar Hub"),
            (9.5850, 76.5380, "Manarcadu St. Mary's", "Kurian Varghese", "Hill View Home Charger"),
            (9.4420, 76.5350, "Changanassery Perunna", "Narayana Panicker", "Perunna Temple Wallbox"),
            (9.7120, 76.6850, "Pala Riverview Road", "Joy Joseph", "Meenachil Riverfront EV"),
            (9.6650, 76.5350, "Ettumanoor Temple West", "Easwaran Namboodiri", "Ettumanoor Bypass Point"),
            (9.5580, 76.7950, "Kanjirappally High Ground", "Dominic Xavier", "Plantation Haven EV"),
            (9.6120, 76.4350, "Kumarakom Boat Jetty", "Venu Gopalan", "Backwater Serenade EV"),
            (9.5750, 76.5120, "Nagampadam Railway Stn", "Philipose John", "Station Link AC Port"),
            (9.6380, 76.5820, "Pampady KK Road", "Scaria Joseph", "Highland Pass EV"),
            (9.4750, 76.6250, "Vazhoor Ponkunnam", "Radhakrishnan K.", "Rubber Town Wallbox"),
            (9.7450, 76.5520, "Kaduthuruthy Market Jn", "Sunny Mathew", "Market Road Eco Charger"),
            (9.5250, 76.5950, "Puthuppally Church View", "Chandy Oommen", "Puthuppally Village EV"),
        ],
    },
    # 8. Alappuzha (12 chargers)
    {
        "city": "Alappuzha",
        "district": "Alappuzha",
        "coords": [
            (9.4981, 76.3388, "Finishing Point Boat Race", "Sudheesh Kumar", "Nehru Trophy Canal EV"),
            (9.4850, 76.3220, "Alappuzha Beach Lighthouse", "Capt. George K.", "Coastal Lighthouse EV"),
            (9.6850, 76.3350, "Cherthala KSRTC Bypass", "Prasanth Nair", "Vayalar Green Wallbox"),
            (9.1720, 76.4950, "Kayamkulam Kayamkulam Kayal", "Nazeer Ahmed", "Thermal Plant Road EV"),
            (9.2450, 76.5450, "Mavelikkara Buddha Jn", "Ravi Varma", "Raja Ravi Varma Green"),
            (9.2850, 76.4620, "Haripad Subrahmanya Temple", "Sukumara Kurup", "Danapadi Bypass Point"),
            (9.5850, 76.3120, "Mararikulam Beach Road", "Sebastian P.", "Resort Strip Eco EV"),
            (9.3650, 76.5120, "Chengannur Railway Station", "Babu Koshy", "Sabari Gateway Charger"),
            (9.3850, 76.4020, "Ambalapuzha Temple East", "Gopala Pillai", "Palpayasam Village EV"),
            (9.6350, 76.3550, "Muhamma Kayal Jetty", "Biju K.R.", "Muhamma Backwater Wallbox"),
        ],
    },
    # 9. Kannur (12 chargers)
    {
        "city": "Kannur",
        "district": "Kannur",
        "coords": [
            (11.8745, 75.3704, "Payyambalam Beach Road", "Rajeev Nambiar", "Payyambalam Coastal EV"),
            (11.8650, 75.3850, "Thana Cantonment", "Brig. Mathew K.", "Cantonment Green Point"),
            (11.7480, 75.4890, "Thalassery Pier Road", "Muhammed Shafi", "Circus Town Harbor EV"),
            (12.1020, 75.2050, "Payyanur Perumba Bypass", "Sreedharan Master", "Perumba Gateway Wallbox"),
            (11.9180, 75.5780, "Mattannur Airport Highway", "Majeed K.T.", "Kannur Airport Express"),
            (11.8950, 75.4350, "Mele Chovva NH-66", "Dileep Kumar", "Chovva Highway Halt"),
            (11.8150, 75.4220, "Edakkad Beach Road", "Vijayan P.", "Edakkad Coastal Plug"),
            (12.0250, 75.3520, "Taliparama Highway Bypass", "Balakrishnan K.", "Taliparamba Eco Hub"),
            (11.7120, 75.5350, "Dharmadam Island Point", "Praveen Raj", "Heritage Green Charger"),
            (11.9650, 75.5250, "Koothuparamba Town", "Raghavan K.", "Malabar Hills Wallbox"),
        ],
    },
    # 10. Kollam (12 chargers)
    {
        "city": "Kollam",
        "district": "Kollam",
        "coords": [
            (8.8932, 76.6141, "Asramam Adventure Park", "Gireesh Babu", "Asramam Green Point"),
            (8.8820, 76.5950, "Tangasseri Lighthouse Lane", "Francis Fernandez", "Portside Heritage EV"),
            (9.0550, 76.5350, "Karunagappally Civil Station", "Shahul Hameed", "Kayal Border Wallbox"),
            (8.9950, 76.7750, "Kottarakkara Ganapathy", "Parameswaran Nair", "Temple Town AC Hub"),
            (9.0180, 76.9250, "Punalur Suspension Bridge", "George Mathew", "Western Ghats Gateway"),
            (8.8520, 76.6550, "Chathannoor NH-66 Bypass", "Vijayakumar S.", "Chathannoor Express"),
            (8.8780, 76.6380, "Kavanad Lakeview Road", "Sunil Thomas", "Ashtamudi Waterside EV"),
            (8.9550, 76.6250, "Chavara KMML Colony", "Radhakrishnan Nair", "Titanium City Wallbox"),
            (8.9220, 76.6850, "Kundara Technopark Rd", "Vaisakh V.", "Kundara Clay City EV"),
            (9.0950, 76.9850, "Thenmala Eco Tourism Road", "Suresh Kumar P.", "Dam Valley Eco Station"),
        ],
    },
    # 11. Idukki (10 chargers)
    {
        "city": "Thodupuzha",
        "district": "Idukki",
        "coords": [
            (9.8959, 76.7184, "Thodupuzha River View", "Tomy Joseph", "River Valley Green EV"),
            (10.0889, 77.0595, "Munnar Tea Museum Road", "Rajan Chettiar", "Cloud Mist Tea Estate EV"),
            (10.0520, 77.0420, "Pallivasal Hydro Point", "Antony Chacko", "High Range Hydro Plug"),
            (9.7450, 77.1250, "Kattappana Cardamom Market", "Sunny Varghese", "Spice Capital Wallbox"),
            (10.0120, 76.9150, "Adimali High Range Road", "Babu Thomas", "Adimali Highway Rest"),
            (9.8520, 76.8850, "Vannappuram Thommankuthu", "Saji Kurian", "Waterfall Eco Point"),
            (9.6050, 77.1650, "Kumily Thekkady Periyar", "Prakash Shenoy", "Periyar Wild Sanctuary EV"),
            (9.8250, 76.9850, "Cheruthoni Idukki Dam", "Johny K.J.", "Dam View Arch Point"),
        ],
    },
    # 12. Wayanad (10 chargers)
    {
        "city": "Kalpetta",
        "district": "Wayanad",
        "coords": [
            (11.6103, 76.0827, "Kalpetta Bypass Coffee", "Shibu Varghese", "Coffee County Green EV"),
            (11.6650, 76.2550, "Sulthan Bathery Jain Temple", "Anand Jain", "Bathery Historic Wallbox"),
            (11.8020, 76.0020, "Mananthavady Pazhassi Tomb", "Sujith Kumar", "Kabini Riverfront AC"),
            (11.5520, 76.1350, "Meppadi Chembra Peak Rd", "Rohan Roy", "Chembra Trekker Halt"),
            (11.5220, 76.0120, "Vythiri Pookode Lake", "Vinod Menon", "Rainforest Lake Villa"),
            (11.7450, 76.1850, "Ambalavayal Heritage Museum", "Madhu K.", "Edakkal Foothills EV"),
            (11.8550, 75.9850, "Thirunelly Temple Way", "Gopalakrishnan E.", "Valley of Life Wallbox"),
            (11.6420, 76.0250, "Pozhuthana Tea Country", "Siddharthan P.", "Mist Valley Green Plug"),
        ],
    },
    # 13. Kasaragod (10 chargers)
    {
        "city": "Kasaragod",
        "district": "Kasaragod",
        "coords": [
            (12.5102, 74.9852, "Kasaragod Mallikarjuna", "Keshava Bhat", "Fort City Solar Wallbox"),
            (12.3120, 75.0920, "Kanhangad Anandashram", "Girish Shenoy", "Peace Valley Green Point"),
            (12.2550, 75.1450, "Nileshwar Palace Road", "Govinda Varma", "Neeleswaram Heritage EV"),
            (12.3950, 75.0350, "Bekal Fort Beach Halt", "Abdulla Kunhi", "Bekal Castle View EV"),
            (12.5820, 74.9650, "Kumbla Riverfront", "Mohan Rao", "North Gateway Wallbox"),
            (12.7150, 74.9050, "Manjeshwaram Kanwatheertha", "Sridhar Naik", "Karnataka Border Fast AC"),
            (12.4450, 75.1550, "Cheruvathur Chandragiri", "Santhosh Kumar B.", "Chandragiri Eco Station"),
            (12.4120, 75.2250, "Badiyadka Bethekkad", "Subraya Holla", "Arecanut Farm Green EV"),
        ],
    },
    # 14. Pathanamthitta (10 chargers)
    {
        "city": "Pathanamthitta",
        "district": "Pathanamthitta",
        "coords": [
            (9.2648, 76.7870, "Pathanamthitta College Rd", "Koshi P. George", "Pilgrim Hub Green Plug"),
            (9.3850, 76.5750, "Thiruvalla Cross Junction", "Philip Cherian", "NRI Haven Solar AC"),
            (9.1550, 76.7350, "Adoor Central Bypass", "Somanathan Nair", "Adoor Bypass Wallbox"),
            (9.3550, 76.7150, "Kozhencherry Bridge West", "Thomas P. Thomas", "Pamba Riverview EV"),
            (9.3120, 76.8850, "Ranni Itteekkal Junction", "Binu Mathew", "Forest Gateway Wallbox"),
            (9.3780, 76.6220, "Kumbanad Ennakkad Rd", "Varghese Abraham", "NRI Village Solar Hub"),
            (9.2250, 76.8250, "Konni Elephant Cage Rd", "Gopakumar K.", "Eco Tourism Forest EV"),
            (9.4050, 76.8050, "Vadasserikkara Sabarimala", "Vijayan Pillai", "Holy Pamba Rest Stop"),
        ],
    },
]

CONNECTOR_TYPES = ["Type 2 (AC)", "Type 2 (AC)", "Type 2 (AC)", "15A 3-Pin / IEC 60309", "25 kW CCS2 (DC Mini)"]
POWER_OPTIONS = [7.4, 7.4, 11.0, 11.0, 22.0, 3.3, 25.0]
AMENITY_PRESETS = [
    "Covered Carport, High-Speed Wi-Fi, Restroom, Filtered Drinking Water",
    "Gated Driveway, CCTV Surveillance, Tea/Coffee, Shaded Lawn",
    "Rooftop Solar Powered, Restroom, Wi-Fi, Paved Parking",
    "Scenic Garden Seating, Air-Conditioned Waiting Lounge, Coffee, Wi-Fi",
    "Quiet Residential Porch, Clean Washroom, 24/7 Access, Filtered Water",
]


def build_kerala_community_chargers() -> List[Dict[str, Any]]:
    """Build a comprehensive list of ~175 authentic Kerala community chargers."""
    chargers: List[Dict[str, Any]] = []
    charger_id = 1

    for hub in KERALA_HUBS:
        city = hub["city"]
        district = hub["district"]
        for lat, lng, addr, host, suffix in hub["coords"]:
            # Jitter slightly to create unique coordinates if multiple in area
            power = random.choice(POWER_OPTIONS)
            connector = "25 kW CCS2 (DC Mini)" if power == 25.0 else ("15A 3-Pin / IEC 60309" if power == 3.3 else "Type 2 (AC)")
            trust = round(random.uniform(4.7, 5.0), 1)
            served = random.randint(18, 95)
            queue = 1 if random.random() < 0.15 else 0
            is_avail = queue == 0
            amenities = random.choice(AMENITY_PRESETS)

            chargers.append({
                "host_name": host,
                "title": f"{host.split()[0]}'s {suffix}",
                "phone": f"+91 9{random.randint(4000, 8999)} {random.randint(10000, 99999)}",
                "address": f"{addr}, {city}",
                "city": city,
                "state": "Kerala",
                "latitude": round(lat, 5),
                "longitude": round(lng, 5),
                "connector_type": connector,
                "power_kw": power,
                "price_per_kwh": STANDARD_COMMUNITY_PRICE_PER_KWH,
                "availability_status": "available" if is_avail else "in_use",
                "queue_count": queue,
                "trust_score": trust,
                "total_charges_served": served,
                "access_hours": "6:00 AM - 10:30 PM" if random.random() > 0.3 else "24/7 Access Available",
                "amenities": amenities,
                "notes": f"Verified Kerala community home charger in {district}. Clean power at guaranteed standard tariff of ₹{STANDARD_COMMUNITY_PRICE_PER_KWH}/kWh.",
            })
            charger_id += 1

    return chargers


KERALA_COMMUNITY_CHARGERS = build_kerala_community_chargers()


def seed_community_chargers_if_empty(db: Session, force_refresh: bool = False) -> int:
    """Seed synthetic community chargers if table is empty, or force_refresh is True."""
    count = db.query(CommunityCharger).count()
    if count > 0 and not force_refresh:
        return count

    if force_refresh and count > 0:
        db.query(CommunityCharger).delete()
        db.commit()

    inserted = 0
    for data in KERALA_COMMUNITY_CHARGERS:
        h3_cell = H3SpatialIndexer.coordinate_to_h3(data["latitude"], data["longitude"], resolution=8)
        charger = CommunityCharger(
            host_name=data["host_name"],
            title=data["title"],
            phone=data["phone"],
            address=data["address"],
            city=data["city"],
            state=data["state"],
            latitude=data["latitude"],
            longitude=data["longitude"],
            h3_cell=h3_cell,
            connector_type=data["connector_type"],
            power_kw=data["power_kw"],
            price_per_kwh=data["price_per_kwh"],
            availability_status=data["availability_status"],
            queue_count=data["queue_count"],
            trust_score=data["trust_score"],
            total_charges_served=data["total_charges_served"],
            access_hours=data["access_hours"],
            amenities=data["amenities"],
            notes=data.get("notes"),
        )
        db.add(charger)
        inserted += 1

    db.commit()
    return inserted
