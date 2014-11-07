#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

. "$DIR/options.sh"

if [ -n "$VAULT_PASSWORD" ]; then
	echo "$VAULT_PASSWORD" | lpass ls | sed 's/ \[id.*$//' > "$DIR/vault.tmp"
else
	# lpass will prompt for a password so this won't work unless a password has been entered recently
	lpass ls | sed 's/ \[id.*$//' > "$DIR/vault.tmp"
fi

if ! cmp "$DIR/vault.tmp" "$DIR/vault"; then
	mv -f "$DIR/vault.tmp" "$DIR/vault"
fi

rm -f "$DIR/vault.tmp"