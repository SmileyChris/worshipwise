import os
import requests
from dotenv import load_dotenv
from requests.auth import HTTPBasicAuth
import json
from datetime import datetime, timedelta


def main():
    # Load environment variables
    load_dotenv()

    api_key = os.getenv("ELVANTO_API_KEY")
    if not api_key:
        print("Error: ELVANTO_API_KEY not found in environment variables.")
        return

    print("ELVANTO_API_KEY found. Fetching services...")

    # API Auth
    auth = HTTPBasicAuth(api_key, "")

    # 1. Get All Services (including historic)
    services_url = "https://api.elvanto.com/v1/services/getAll.json"

    # Fetch from 1 year ago to cover historic services
    start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
    params = {"start": start_date}

    try:
        response = requests.get(services_url, auth=auth, params=params)
        if response.status_code != 200:
            print(f"Failed to fetch services: {response.status_code}")
            return

        data = response.json()
        if data.get("status") != "ok":
            print("API Error (services/getAll):")
            print(json.dumps(data, indent=2))
            return

        services = data.get("services", {}).get("service", [])
        print(f"Found {len(services)} services (since {start_date}).")

        if not services:
            return

        # 2. Get Details of the First Service
        first_service = services[0]
        service_id = first_service.get("id")
        service_date = first_service.get("date")
        print(f"Inspecting Service: {service_date} (ID: {service_id})")

        details_url = "https://api.elvanto.com/v1/services/getInfo.json"

        params = {"id": service_id, "fields[]": ["plans", "volunteers"]}

        detail_response = requests.get(details_url, auth=auth, params=params)

        if detail_response.status_code != 200:
            print(f"Failed to fetch service details: {detail_response.status_code}")
            return

        detail_data = detail_response.json()
        if detail_data.get("status") == "ok":
            service_details = detail_data.get("service", [{}])[0]

            plans = service_details.get("plans", {}).get("plan", [])
            print(f"Plans found: {len(plans)}")

            for plan in plans:
                print(f"Plan: {plan.get('activity', {}).get('name')}")
                items = plan.get("items", {}).get("item", [])
                print(f"  Items in plan: {len(items)}")
                for item in items:
                    if item.get("song"):
                        song_title = item.get("song", {}).get("title", "Unknown Title")
                        print(f"    - Song: {song_title}")
                    elif item.get("heading"):
                        print(f"    - Heading: {item.get('heading')}")
                    else:
                        print(f"    - Item: {item.get('title', 'Unknown')}")

        else:
            print("API Error (services/getInfo):")
            print(json.dumps(detail_data, indent=2))

    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    main()
