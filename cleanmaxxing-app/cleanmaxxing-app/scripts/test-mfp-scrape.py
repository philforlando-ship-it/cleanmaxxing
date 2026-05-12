"""
Smoke test for python-myfitnesspal against your real MFP account.

Why: python-myfitnesspal hasn't had a major release in over a year.
Before we wire it into a production sync function, confirm it actually
works against current MFP for your account on this machine + this
Python version.

Setup:
    pip install myfitnesspal   # PyPI name (the GitHub project is python-myfitnesspal)
    $env:MFP_TEST_USERNAME = "your-mfp-email"
    $env:MFP_TEST_PASSWORD = "your-mfp-password"
    python scripts/test-mfp-scrape.py

Output: today's totals (calories + macros) for the configured account,
plus the raw `Day` shape so we can see what fields are available.
Nothing is sent to a server; nothing is written to disk.

If this fails with auth errors, MFP has changed something and the
library needs a patch (check its GitHub issues). If it fails with
import errors on Python 3.14, downgrade to Python 3.12 — the
library's wheels may not cover 3.14 yet.
"""

import os
import sys
import datetime


def main() -> int:
    username = os.environ.get("MFP_TEST_USERNAME")
    password = os.environ.get("MFP_TEST_PASSWORD")
    if not username or not password:
        print(
            "ERROR: set MFP_TEST_USERNAME and MFP_TEST_PASSWORD env vars first.\n"
            "PowerShell example:\n"
            "    $env:MFP_TEST_USERNAME = 'you@example.com'\n"
            "    $env:MFP_TEST_PASSWORD = 'your-password'\n"
            "    python scripts/test-mfp-scrape.py",
            file=sys.stderr,
        )
        return 1

    try:
        import myfitnesspal  # type: ignore
    except ImportError:
        print(
            "ERROR: myfitnesspal not installed. Run:\n"
            "    pip install myfitnesspal",
            file=sys.stderr,
        )
        return 1

    print(f"Connecting to MyFitnessPal as {username}...")
    try:
        client = myfitnesspal.Client(username=username, password=password)
    except Exception as e:  # noqa: BLE001
        print(f"AUTH FAILED: {type(e).__name__}: {e}", file=sys.stderr)
        return 2

    today = datetime.date.today()
    print(f"Fetching totals for {today}...")
    try:
        day = client.get_date(today.year, today.month, today.day)
    except Exception as e:  # noqa: BLE001
        print(f"FETCH FAILED: {type(e).__name__}: {e}", file=sys.stderr)
        return 3

    print("\n=== Day totals ===")
    print(f"Totals dict: {day.totals}")
    print(f"Goals dict:  {getattr(day, 'goals', '(no .goals attr)')}")
    print(f"Water:       {getattr(day, 'water', '(no .water attr)')}")

    meals = getattr(day, "meals", None)
    if meals is not None:
        print(f"\n=== Meals ({len(meals)}) ===")
        for meal in meals:
            print(f"  {meal.name}: {len(meal.entries)} entries")

    print("\nOK — scraper works against this account.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
