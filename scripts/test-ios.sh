#!/bin/sh
set -eu
test_dir=$(mktemp -d "${TMPDIR:-/tmp}/abencoada-ios-tests.XXXXXX")
trap 'rm -rf "$test_dir"' EXIT INT TERM
xcrun swiftc ios/App/App/OfflineQueue.swift tests/ios-offline.swift -o "$test_dir/offline-tests"
"$test_dir/offline-tests"
