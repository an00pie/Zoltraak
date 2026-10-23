"""CLI ingestion command to fetch and persist EV charging stations into Zoltraak."""

import argparse
import logging
import sys
from pathlib import Path

# Add project root to sys.path so imports work seamlessly
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.app.core.config import settings
from backend.app.db.session import SessionLocal, init_db
from backend.app.db.models import Station
from backend.app.ingestion.pipeline import IngestionPipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("zoltraak.ingest")


def main():
    parser = argparse.ArgumentParser(
        description="Ingest EV charging stations from Open Charge Map into Zoltraak database with Uber H3 indexing."
    )
    parser.add_argument(
        "--country",
        "-c",
        default="IN",
        help="Two-letter ISO country code (default: IN)",
    )
    parser.add_argument(
        "--max-results",
        "-m",
        type=int,
        default=100,
        help="Maximum records to fetch from live API (default: 100)",
    )
    parser.add_argument(
        "--fixture",
        "-f",
        type=str,
        default=None,
        help="Path to offline JSON fixture file (bypasses live API)",
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Use built-in sample India fixture (data/fixtures/sample_ocm_india.json)",
    )
    parser.add_argument(
        "--h3-res",
        type=int,
        default=settings.H3_DEFAULT_RESOLUTION,
        help=f"Uber H3 resolution level (default: {settings.H3_DEFAULT_RESOLUTION})",
    )

    args = parser.parse_args()

    # Determine fixture path
    fixture_path = None
    if args.sample:
        fixture_path = settings.DATA_DIR / "fixtures" / "sample_ocm_india.json"
    elif args.fixture:
        fixture_path = Path(args.fixture)

    print("\n=======================================================")
    print(" ⚡ Zoltraak — EV Charging Data Ingestion Pipeline")
    print("=======================================================")
    print(f" Target Country : {args.country}")
    print(f" Max Results    : {args.max_results}")
    print(f" H3 Resolution  : {args.h3_res}")
    print(f" Data Source    : {'Fixture: ' + str(fixture_path) if fixture_path else 'Live Open Charge Map API'}")
    print(f" Database       : {settings.DATABASE_URL.split('@')[-1]}")
    print("-------------------------------------------------------\n")

    init_db()
    db = SessionLocal()

    try:
        pipeline = IngestionPipeline(db=db)
        run = pipeline.run(
            country_code=args.country,
            max_results=args.max_results,
            fixture_path=fixture_path,
            h3_resolution=args.h3_res,
        )

        print("\n Ingestion Completed Successfully!")
        print("-------------------------------------------------------")
        print(f" Ingestion Run ID   : #{run.id}")
        print(f" Status             : {run.status.upper()}")
        print(f" Records Fetched    : {run.records_fetched}")
        print(f" Records Inserted   : {run.records_inserted}")
        print(f" Records Updated    : {run.records_updated}")
        print(f" Records Skipped    : {run.records_skipped}")
        print("-------------------------------------------------------")

        # Display sample persisted records
        sample_stations = (
            db.query(Station)
            .filter(Station.country_code == args.country)
            .order_by(Station.updated_at.desc())
            .limit(5)
            .all()
        )

        print(f"\n Sample Indexed Stations in Database ({len(sample_stations)} shown):")
        for st in sample_stations:
            conn_summary = ", ".join(f"{c.connector_type} ({c.power_kw}kW)" for c in st.connectors)
            print(f" • [ID {st.source_id}] {st.name[:35]:<35} | H3: {st.h3_cell} | {conn_summary}")

        print("=======================================================\n")
        return 0

    except PermissionError as e:
        print(f"\n[ERROR] Authentication failure: {e}", file=sys.stderr)
        print("Tip: Run with --sample to use the offline Indian charging dataset fixture.\n", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"\n[ERROR] Ingestion failed: {e}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
