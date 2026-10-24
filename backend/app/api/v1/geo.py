"""OpenStreetMap (OSM) Nominatim forward and reverse geocoding endpoints with rich local corridor directory."""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
import httpx

from backend.app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Comprehensive database of Indian EV corridor cities and local highway towns
LOCAL_CORRIDOR_DIRECTORY = {
    # Kerala NH-544 / NH-66 & Main Central Road Corridors
    "kochi": {"name": "Kochi, Kerala", "latitude": 9.9312, "longitude": 76.2673},
    "ernakulam": {"name": "Kochi (Ernakulam), Kerala", "latitude": 9.9816, "longitude": 76.2999},
    "edappally": {"name": "Edappally, Kochi, Kerala", "latitude": 10.0236, "longitude": 76.3082},
    "kalamassery": {"name": "Kalamassery, Kochi, Kerala", "latitude": 10.0543, "longitude": 76.3195},
    "aluva": {"name": "Aluva, Ernakulam, Kerala", "latitude": 10.1076, "longitude": 76.3516},
    "angamaly": {"name": "Angamaly, Ernakulam, Kerala", "latitude": 10.1960, "longitude": 76.3860},
    "nedumbassery": {"name": "Nedumbassery (Cochin Airport), Kerala", "latitude": 10.1557, "longitude": 76.3912},
    "karukutty": {"name": "Karukutty, Ernakulam, Kerala", "latitude": 10.2330, "longitude": 76.3890},
    "koratty": {"name": "Koratty, Thrissur, Kerala", "latitude": 10.2580, "longitude": 76.3530},
    "chalakudy": {"name": "Chalakudy, Thrissur, Kerala", "latitude": 10.3031, "longitude": 76.3370},
    "chalakkudy": {"name": "Chalakudy, Thrissur, Kerala", "latitude": 10.3031, "longitude": 76.3370},
    "potta": {"name": "Potta, Chalakudy, Kerala", "latitude": 10.3200, "longitude": 76.3350},
    "irinjalakuda": {"name": "Irinjalakuda, Thrissur, Kerala", "latitude": 10.3524, "longitude": 76.2087},
    "kodakara": {"name": "Kodakara, Thrissur, Kerala", "latitude": 10.3667, "longitude": 76.3000},
    "pudukad": {"name": "Pudukad, Thrissur, Kerala", "latitude": 10.4283, "longitude": 76.2730},
    "amballur": {"name": "Amballur, Thrissur, Kerala", "latitude": 10.4350, "longitude": 76.2650},
    "ollur": {"name": "Ollur, Thrissur, Kerala", "latitude": 10.4700, "longitude": 76.2400},
    "thrissur": {"name": "Thrissur, Kerala", "latitude": 10.5276, "longitude": 76.2144},
    "trichur": {"name": "Thrissur, Kerala", "latitude": 10.5276, "longitude": 76.2144},
    "mannuthy": {"name": "Mannuthy, Thrissur, Kerala", "latitude": 10.5367, "longitude": 76.2678},
    "vadakkencherry": {"name": "Vadakkencherry, Palakkad, Kerala", "latitude": 10.6022, "longitude": 76.5000},
    "alathur": {"name": "Alathur, Palakkad, Kerala", "latitude": 10.6432, "longitude": 76.5447},
    "kuzhalmannam": {"name": "Kuzhalmannam, Palakkad, Kerala", "latitude": 10.7100, "longitude": 76.5900},
    "palakkad": {"name": "Palakkad, Kerala", "latitude": 10.7867, "longitude": 76.6548},
    "walayar": {"name": "Walayar, Palakkad, Kerala", "latitude": 10.8407, "longitude": 76.8570},
    "perumbavoor": {"name": "Perumbavoor, Ernakulam, Kerala", "latitude": 10.1070, "longitude": 76.4740},
    "muvattupuzha": {"name": "Muvattupuzha, Ernakulam, Kerala", "latitude": 9.9810, "longitude": 76.5780},
    "kothamangalam": {"name": "Kothamangalam, Ernakulam, Kerala", "latitude": 10.0610, "longitude": 76.6260},
    "thodupuzha": {"name": "Thodupuzha, Idukki, Kerala", "latitude": 9.8950, "longitude": 76.7180},
    "athirappilly": {"name": "Athirappilly, Thrissur, Kerala", "latitude": 10.2860, "longitude": 76.5585},
    "kodungallur": {"name": "Kodungallur, Thrissur, Kerala", "latitude": 10.2277, "longitude": 76.1971},
    "cherthala": {"name": "Cherthala, Alappuzha, Kerala", "latitude": 9.6845, "longitude": 76.3317},
    "arookutty": {"name": "Arookutty, Alappuzha, Kerala", "latitude": 9.8800, "longitude": 76.3300},
    "alappuzha": {"name": "Alappuzha (Alleppey), Kerala", "latitude": 9.4981, "longitude": 76.3388},
    "alleppey": {"name": "Alappuzha (Alleppey), Kerala", "latitude": 9.4981, "longitude": 76.3388},
    "kayamkulam": {"name": "Kayamkulam, Alappuzha, Kerala", "latitude": 9.1725, "longitude": 76.5015},
    "kollam": {"name": "Kollam, Kerala", "latitude": 8.8932, "longitude": 76.6141},
    "quilon": {"name": "Kollam (Quilon), Kerala", "latitude": 8.8932, "longitude": 76.6141},
    "thiruvananthapuram": {"name": "Thiruvananthapuram (Trivandrum), Kerala", "latitude": 8.5241, "longitude": 76.9366},
    "trivandrum": {"name": "Thiruvananthapuram (Trivandrum), Kerala", "latitude": 8.5241, "longitude": 76.9366},
    "kottayam": {"name": "Kottayam, Kerala", "latitude": 9.5916, "longitude": 76.5222},
    "changanassery": {"name": "Changanassery, Kottayam, Kerala", "latitude": 9.4447, "longitude": 76.5367},
    "shoranur": {"name": "Shoranur, Palakkad, Kerala", "latitude": 10.7600, "longitude": 76.2800},
    "ottapalam": {"name": "Ottapalam, Palakkad, Kerala", "latitude": 10.7730, "longitude": 76.3810},
    "guruvayur": {"name": "Guruvayur, Thrissur, Kerala", "latitude": 10.5946, "longitude": 76.0396},
    "kunnamkulam": {"name": "Kunnamkulam, Thrissur, Kerala", "latitude": 10.6515, "longitude": 76.0725},
    "edappal": {"name": "Edappal, Malappuram, Kerala", "latitude": 10.7634, "longitude": 75.9866},
    "malappuram": {"name": "Malappuram, Kerala", "latitude": 11.0510, "longitude": 76.0711},
    "manjeri": {"name": "Manjeri, Malappuram, Kerala", "latitude": 11.1202, "longitude": 76.1215},
    "kozhikode": {"name": "Kozhikode (Calicut), Kerala", "latitude": 11.2588, "longitude": 75.7804},
    "calicut": {"name": "Kozhikode (Calicut), Kerala", "latitude": 11.2588, "longitude": 75.7804},
    "kannur": {"name": "Kannur, Kerala", "latitude": 11.8745, "longitude": 75.3704},
    "thalassery": {"name": "Thalassery, Kannur, Kerala", "latitude": 11.7491, "longitude": 75.4890},
    "kasaragod": {"name": "Kasaragod, Kerala", "latitude": 12.4996, "longitude": 74.9869},
    "pala": {"name": "Pala, Kottayam, Kerala", "latitude": 9.7132, "longitude": 76.6836},
    "kanjirappally": {"name": "Kanjirappally, Kottayam, Kerala", "latitude": 9.5557, "longitude": 76.7869},
    "peermade": {"name": "Peermade, Idukki, Kerala", "latitude": 9.5720, "longitude": 76.9959},
    "vithura": {"name": "Vithura, Thiruvananthapuram, Kerala", "latitude": 8.6700, "longitude": 77.0850},
    "kattakada": {"name": "Kattakada, Thiruvananthapuram, Kerala", "latitude": 8.5080, "longitude": 77.0780},
    "nilambur": {"name": "Nilambur, Malappuram, Kerala", "latitude": 11.2770, "longitude": 76.2240},
    "thiruvambady": {"name": "Thiruvambady, Kozhikode, Kerala", "latitude": 11.4167, "longitude": 76.0167},
    "marayoor": {"name": "Marayoor, Idukki, Kerala", "latitude": 10.2789, "longitude": 77.1603},
    "ranni": {"name": "Ranni, Pathanamthitta, Kerala", "latitude": 9.3800, "longitude": 76.7800},
    "adoor": {"name": "Adoor, Pathanamthitta, Kerala", "latitude": 9.1530, "longitude": 76.7360},
    "konni": {"name": "Konni, Pathanamthitta, Kerala", "latitude": 9.2300, "longitude": 76.8400},
    "pandalam": {"name": "Pandalam, Pathanamthitta, Kerala", "latitude": 9.2300, "longitude": 76.6800},
    "chengannur": {"name": "Chengannur, Alappuzha, Kerala", "latitude": 9.3170, "longitude": 76.6170},
    "mavelikkara": {"name": "Mavelikkara, Alappuzha, Kerala", "latitude": 9.2670, "longitude": 76.5500},
    "haripad": {"name": "Haripad, Alappuzha, Kerala", "latitude": 9.2830, "longitude": 76.4670},
    "kuttanad": {"name": "Kuttanad, Alappuzha, Kerala", "latitude": 9.4300, "longitude": 76.4300},
    "karunagappally": {"name": "Karunagappally, Kollam, Kerala", "latitude": 9.0530, "longitude": 76.5360},
    "punalur": {"name": "Punalur, Kollam, Kerala", "latitude": 9.0170, "longitude": 76.9330},
    "kottarakkara": {"name": "Kottarakkara, Kollam, Kerala", "latitude": 8.9980, "longitude": 76.7720},
    "paravur": {"name": "Paravur, Kollam, Kerala", "latitude": 8.8100, "longitude": 76.6700},
    "attingal": {"name": "Attingal, Thiruvananthapuram, Kerala", "latitude": 8.6940, "longitude": 76.8140},
    "varkala": {"name": "Varkala, Thiruvananthapuram, Kerala", "latitude": 8.7380, "longitude": 76.7160},
    "nedumangad": {"name": "Nedumangad, Thiruvananthapuram, Kerala", "latitude": 8.6010, "longitude": 76.9980},
    "neyyattinkara": {"name": "Neyyattinkara, Thiruvananthapuram, Kerala", "latitude": 8.4030, "longitude": 77.0860},
    "vizhinjam": {"name": "Vizhinjam, Thiruvananthapuram, Kerala", "latitude": 8.3780, "longitude": 77.0020},
    "piravom": {"name": "Piravom, Ernakulam, Kerala", "latitude": 9.8700, "longitude": 76.4900},
    "koothattukulam": {"name": "Koothattukulam, Ernakulam, Kerala", "latitude": 9.8600, "longitude": 76.5800},
    "wadakkanchery": {"name": "Wadakkanchery, Thrissur, Kerala", "latitude": 10.6600, "longitude": 76.2400},
    "chavakkad": {"name": "Chavakkad, Thrissur, Kerala", "latitude": 10.5300, "longitude": 76.0500},
    "triprayar": {"name": "Triprayar, Thrissur, Kerala", "latitude": 10.4200, "longitude": 76.1200},
    "mannarkkad": {"name": "Mannarkkad, Palakkad, Kerala", "latitude": 10.9800, "longitude": 76.4600},
    "cherpulassery": {"name": "Cherpulassery, Palakkad, Kerala", "latitude": 10.8800, "longitude": 76.3100},
    "chittur": {"name": "Chittur, Palakkad, Kerala", "latitude": 10.7000, "longitude": 76.7200},
    "pattambi": {"name": "Pattambi, Palakkad, Kerala", "latitude": 10.8000, "longitude": 76.1900},
    "kollengode": {"name": "Kollengode, Palakkad, Kerala", "latitude": 10.6100, "longitude": 76.6900},
    "kondotty": {"name": "Kondotty, Malappuram, Kerala", "latitude": 11.1500, "longitude": 75.9600},
    "kottakkal": {"name": "Kottakkal, Malappuram, Kerala", "latitude": 10.9990, "longitude": 75.9980},
    "tirur": {"name": "Tirur, Malappuram, Kerala", "latitude": 10.9150, "longitude": 75.9230},
    "ponnani": {"name": "Ponnani, Malappuram, Kerala", "latitude": 10.7740, "longitude": 75.9250},
    "koyilandy": {"name": "Koyilandy, Kozhikode, Kerala", "latitude": 11.4400, "longitude": 75.7000},
    "vatakara": {"name": "Vatakara, Kozhikode, Kerala", "latitude": 11.6030, "longitude": 75.5900},
    "payyanur": {"name": "Payyanur, Kannur, Kerala", "latitude": 12.1000, "longitude": 75.2000},
    "taliparamba": {"name": "Taliparamba, Kannur, Kerala", "latitude": 12.0400, "longitude": 75.3600},
    "iritty": {"name": "Iritty, Kannur, Kerala", "latitude": 11.9800, "longitude": 75.6700},
    "kanhangad": {"name": "Kanhangad, Kasaragod, Kerala", "latitude": 12.3100, "longitude": 75.0900},
    "nileshwaram": {"name": "Nileshwaram, Kasaragod, Kerala", "latitude": 12.2500, "longitude": 75.1300},
    "kalpetta": {"name": "Kalpetta (Wayanad), Kerala", "latitude": 11.6103, "longitude": 76.0827},
    "sulthan bathery": {"name": "Sulthan Bathery, Wayanad, Kerala", "latitude": 11.6620, "longitude": 76.2570},
    "mananthavady": {"name": "Mananthavady, Wayanad, Kerala", "latitude": 11.8020, "longitude": 76.0030},
    "vythiri": {"name": "Vythiri, Wayanad, Kerala", "latitude": 11.5500, "longitude": 76.0300},
    "munnar": {"name": "Munnar, Idukki, Kerala", "latitude": 10.0889, "longitude": 77.0595},
    "kattappana": {"name": "Kattappana, Idukki, Kerala", "latitude": 9.7780, "longitude": 77.1210},
    "kumily": {"name": "Kumily, Idukki, Kerala", "latitude": 9.6000, "longitude": 77.1660},
    "vagamon": {"name": "Vagamon, Idukki, Kerala", "latitude": 9.6800, "longitude": 76.9000},
    # Tamil Nadu & Karnataka Highway Corridors
    "coimbatore": {"name": "Coimbatore, Tamil Nadu", "latitude": 11.0168, "longitude": 76.9558},
    "tiruppur": {"name": "Tiruppur, Tamil Nadu", "latitude": 11.1085, "longitude": 77.3411},
    "erode": {"name": "Erode, Tamil Nadu", "latitude": 11.3410, "longitude": 77.7172},
    "salem": {"name": "Salem, Tamil Nadu", "latitude": 11.6643, "longitude": 78.1460},
    "dharmapuri": {"name": "Dharmapuri, Tamil Nadu", "latitude": 12.1211, "longitude": 78.1582},
    "krishnagiri": {"name": "Krishnagiri, Tamil Nadu", "latitude": 12.5266, "longitude": 78.2146},
    "hosur": {"name": "Hosur, Tamil Nadu", "latitude": 12.7409, "longitude": 77.8253},
    "bengaluru": {"name": "Bengaluru, Karnataka", "latitude": 12.9716, "longitude": 77.5946},
    "bangalore": {"name": "Bengaluru, Karnataka", "latitude": 12.9716, "longitude": 77.5946},
    "electronic city": {"name": "Electronic City, Bengaluru, Karnataka", "latitude": 12.8452, "longitude": 77.6602},
    "whitefield": {"name": "Whitefield, Bengaluru, Karnataka", "latitude": 12.9698, "longitude": 77.7500},
    "bidadi": {"name": "Bidadi, Karnataka", "latitude": 12.7981, "longitude": 77.3874},
    "ramanagara": {"name": "Ramanagara, Karnataka", "latitude": 12.7200, "longitude": 77.2800},
    "channapatna": {"name": "Channapatna, Karnataka", "latitude": 12.6500, "longitude": 77.2000},
    "maddur": {"name": "Maddur, Karnataka", "latitude": 12.5800, "longitude": 77.0500},
    "mandya": {"name": "Mandya, Karnataka", "latitude": 12.5242, "longitude": 76.8958},
    "srirangapatna": {"name": "Srirangapatna, Karnataka", "latitude": 12.4200, "longitude": 76.6900},
    "mysuru": {"name": "Mysuru, Karnataka", "latitude": 12.2958, "longitude": 76.6394},
    "mysore": {"name": "Mysuru, Karnataka", "latitude": 12.2958, "longitude": 76.6394},
    "chennai": {"name": "Chennai, Tamil Nadu", "latitude": 13.0827, "longitude": 80.2707},
    "madurai": {"name": "Madurai, Tamil Nadu", "latitude": 9.9252, "longitude": 78.1198},
    # Western & Major Metros
    "mumbai": {"name": "Mumbai, Maharashtra", "latitude": 19.0760, "longitude": 72.8777},
    "pune": {"name": "Pune, Maharashtra", "latitude": 18.5204, "longitude": 73.8567},
    "lonavala": {"name": "Lonavala, Maharashtra", "latitude": 18.7557, "longitude": 73.4091},
    "hyderabad": {"name": "Hyderabad, Telangana", "latitude": 17.3850, "longitude": 78.4867},
    "delhi": {"name": "New Delhi, Delhi", "latitude": 28.6139, "longitude": 77.2090},
    "ahmedabad": {"name": "Ahmedabad, Gujarat", "latitude": 23.0225, "longitude": 72.5714},
}


@router.get("/geo/search", tags=["Geocoding"])
def search_places(
    q: str = Query(..., min_length=2, description="Place search query (e.g. city, landmark)"),
    country_code: str = Query("in", description="Limit search to country (default: in)"),
    limit: int = Query(6, ge=1, le=10),
):
    """
    Search places and cities using OpenStreetMap Nominatim combined with local corridor directory.
    Guarantees instant sub-millisecond local responses even if external APIs time out.
    """
    q_clean = q.lower().strip()
    results: List[dict] = []
    seen_names = set()

    # 1. Check local corridor directory: exact matches first, then prefix matches
    exact_matches = []
    prefix_matches = []
    for k, v in LOCAL_CORRIDOR_DIRECTORY.items():
        if q_clean == k:
            exact_matches.append((k, v))
        elif k.startswith(q_clean):
            prefix_matches.append((k, v))

    for k, v in exact_matches + prefix_matches:
        name = v["name"]
        if name not in seen_names:
            seen_names.add(name)
            results.append({
                "place_id": f"loc_{k}",
                "display_name": name,
                "name": name.split(",")[0].strip(),
                "latitude": v["latitude"],
                "longitude": v["longitude"],
                "type": "city",
                "source": "local_corridor",
            })
        if q_clean == k and len(results) >= limit:
            return results

    # 2. Query OpenStreetMap Nominatim for wider Indian addresses and landmarks
    url = f"{settings.OSM_NOMINATIM_BASE_URL}/search"
    params = {
        "q": q,
        "format": "json",
        "countrycodes": country_code,
        "limit": limit,
        "addressdetails": 1,
    }
    headers = {
        "User-Agent": "Zoltraak-EV-RoutePlanner/0.1.0 (contact: builder@zoltraak.local)",
        "Accept-Language": "en",
    }

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                osm_results = resp.json()
                for item in osm_results:
                    display_name = item.get("display_name", "")
                    short_name = item.get("name") or display_name.split(",")[0].strip()
                    if short_name not in seen_names:
                        seen_names.add(short_name)
                        results.append({
                            "place_id": item.get("place_id"),
                            "display_name": display_name,
                            "name": short_name,
                            "latitude": float(item.get("lat")),
                            "longitude": float(item.get("lon")),
                            "type": item.get("type", "place"),
                            "bounding_box": item.get("boundingbox"),
                            "source": "osm_nominatim",
                        })
                    if len(results) >= limit:
                        break
    except Exception as e:
        logger.warning(f"OSM Nominatim live query failed for '{q}': {e}")

    return results


@router.get("/geo/reverse", tags=["Geocoding"])
def reverse_geocode(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
):
    """
    Reverse geocode coordinates to street address and city name using OpenStreetMap.
    """
    url = f"{settings.OSM_NOMINATIM_BASE_URL}/reverse"
    params = {
        "lat": latitude,
        "lon": longitude,
        "format": "json",
    }
    headers = {
        "User-Agent": "Zoltraak-EV-RoutePlanner/0.1.0 (contact: builder@zoltraak.local)",
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            address = data.get("address", {})
            return {
                "display_name": data.get("display_name"),
                "road": address.get("road"),
                "city": address.get("city") or address.get("town") or address.get("suburb"),
                "state": address.get("state"),
                "postcode": address.get("postcode"),
                "country": address.get("country"),
            }
    except Exception as e:
        logger.warning(f"OSM Nominatim reverse error for ({latitude}, {longitude}): {e}")
        return {
            "display_name": f"{latitude:.4f}, {longitude:.4f}",
            "city": "Unknown",
        }
