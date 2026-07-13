"""Dashboard metrics — computed live from the DB on every request (rule 8).

No cache to invalidate: every allocation/release is reflected immediately.
Shapes mirror the mock store's derived DashboardMetrics/ProjectStats/FloorStats
(frontend/src/lib/mock/store.tsx) so the Phase 7 swap is mechanical.
"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Employee, Project, Seat, SeatAllocation
from app.seed.data import project_home_zone_key


def _pct(part: int, total: int) -> int:
    return round(part * 100 / total) if total else 0


def summary(db: Session) -> dict:
    seat_counts: dict[str, int] = dict(
        db.execute(select(Seat.status, func.count()).group_by(Seat.status)).all()
    )
    total_seats = sum(seat_counts.values())
    occupied = seat_counts.get("OCCUPIED", 0)
    total_employees = db.scalar(
        select(func.count()).select_from(Employee).where(Employee.status != "EXITED")
    )
    pending_joiners = db.scalar(
        select(func.count())
        .select_from(Employee)
        .where(Employee.status == "PENDING_ALLOCATION")
    )
    return {
        "total_employees": total_employees,
        "total_seats": total_seats,
        "occupied": occupied,
        "available": seat_counts.get("AVAILABLE", 0),
        "reserved": seat_counts.get("RESERVED", 0),
        "maintenance": seat_counts.get("MAINTENANCE", 0),
        "pending_joiners": pending_joiners,
        "utilization_pct": _pct(occupied, total_seats),
    }


def project_utilization(db: Session) -> list[dict]:
    headcount: dict[int, int] = dict(
        db.execute(
            select(Employee.project_id, func.count())
            .where(Employee.status != "EXITED")
            .group_by(Employee.project_id)
        ).all()
    )
    seated: dict[int, int] = dict(
        db.execute(
            select(Employee.project_id, func.count())
            .select_from(Employee)
            .join(SeatAllocation, SeatAllocation.employee_id == Employee.id)
            .where(
                SeatAllocation.allocation_status == "ACTIVE",
                Employee.status != "EXITED",
            )
            .group_by(Employee.project_id)
        ).all()
    )
    projects = db.scalars(select(Project).order_by(Project.id)).all()
    return [
        {
            "project": project,
            "headcount": headcount.get(project.id, 0),
            "seated": seated.get(project.id, 0),
            "home_zone": project_home_zone_key(project.id),
        }
        for project in projects
    ]


def floor_utilization(db: Session) -> list[dict]:
    by_floor: dict[int, dict[str, int]] = {}
    for floor, seat_status, count in db.execute(
        select(Seat.floor, Seat.status, func.count()).group_by(Seat.floor, Seat.status)
    ):
        by_floor.setdefault(floor, {})[seat_status] = count

    result = []
    for floor in sorted(by_floor):
        counts = by_floor[floor]
        total = sum(counts.values())
        occupied = counts.get("OCCUPIED", 0)
        result.append(
            {
                "floor": floor,
                "total": total,
                "occupied": occupied,
                "available": counts.get("AVAILABLE", 0),
                "reserved": counts.get("RESERVED", 0),
                "maintenance": counts.get("MAINTENANCE", 0),
                "occupancy_pct": _pct(occupied, total),
            }
        )
    return result
