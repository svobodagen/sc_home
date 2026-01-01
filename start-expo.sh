#!/bin/bash
export EXPO_OFFLINE=false
export EAS_NO_VCS=1
killall node 2>/dev/null
sleep 2
exec npx expo start --localhost
