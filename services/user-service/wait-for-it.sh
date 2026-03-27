#!/bin/bash
set -e

host="$1"
port="$2"
shift 2
cmd="$@"

echo "Waiting for $host:$port..."

while ! nc -z "$host" "$port"; do
  echo "Waiting for $host:$port... (retrying in 2 seconds)"
  sleep 2
done

echo "$host:$port is available!"
exec $cmd
