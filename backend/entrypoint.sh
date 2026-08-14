#!/bin/sh
set -eu

python manage.py migrate --noinput
python manage.py cleanup_expired_demo_data --no-color

exec "$@"
