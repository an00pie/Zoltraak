"""SQLAlchemy database models for Zoltraak EV charging domain."""

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Station(Base):
    """Charging station entity with exact coordinates, entrance data, and H3 spatial index."""

    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source = Column(String(50), nullable=False, default="openchargemap", index=True)
    source_id = Column(Integer, nullable=False, index=True)

    name = Column(String(255), nullable=False, index=True)
    operator_name = Column(String(255), nullable=True, index=True)
    operator_id = Column(Integer, nullable=True)

    # Spatial coordinates
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)

    # Separate verified entrance coordinates (per Section 4 requirements)
    entrance_latitude = Column(Float, nullable=True)
    entrance_longitude = Column(Float, nullable=True)
    has_verified_entrance = Column(Boolean, default=False, nullable=False)

    # Uber H3 Spatial Index
    h3_cell = Column(String(20), nullable=False, index=True)
    h3_resolution = Column(Integer, nullable=False, default=8)

    # Address & location details
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True, index=True)
    state = Column(String(100), nullable=True, index=True)
    postcode = Column(String(20), nullable=True)
    country_code = Column(String(10), default="IN", nullable=False, index=True)

    # Operational status and metadata
    usage_type = Column(String(100), nullable=True)
    usage_cost = Column(String(255), nullable=True)
    status_type = Column(String(100), nullable=True)
    is_operational = Column(Boolean, nullable=True)
    number_of_points = Column(Integer, nullable=True)
    data_quality_score = Column(Integer, nullable=True)

    # Provenance timestamps
    source_last_updated = Column(DateTime, nullable=True)
    ingested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Connectors relationship
    connectors = relationship(
        "StationConnector",
        back_populates="station",
        cascade="all, delete-orphan",
        order_by="StationConnector.id",
    )

    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uq_station_source_source_id"),
    )

    def __repr__(self) -> str:
        return f"<Station(id={self.id}, name='{self.name}', h3='{self.h3_cell}')>"


class StationConnector(Base):
    """Specific connector/plug at a charging station (e.g. CCS2, Type 2, GB/T)."""

    __tablename__ = "station_connectors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    station_id = Column(
        Integer,
        ForeignKey("stations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_connector_id = Column(Integer, nullable=True)

    connector_type = Column(String(50), nullable=False, index=True)
    power_kw = Column(Float, nullable=True, index=True)
    current_type = Column(String(50), nullable=True)
    voltage = Column(Float, nullable=True)
    amperage = Column(Float, nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    status = Column(String(50), nullable=True)

    station = relationship("Station", back_populates="connectors")

    def __repr__(self) -> str:
        return f"<StationConnector(id={self.id}, type='{self.connector_type}', power={self.power_kw}kW)>"


class IngestionRun(Base):
    """Audit record tracking data ingestion batches and synchronization metrics."""

    __tablename__ = "ingestion_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source = Column(String(50), nullable=False, default="openchargemap")
    country_code = Column(String(10), nullable=False, default="IN")
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False, default="in_progress")  # in_progress, completed, failed

    records_fetched = Column(Integer, default=0, nullable=False)
    records_inserted = Column(Integer, default=0, nullable=False)
    records_updated = Column(Integer, default=0, nullable=False)
    records_skipped = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<IngestionRun(id={self.id}, status='{self.status}', fetched={self.records_fetched})>"
