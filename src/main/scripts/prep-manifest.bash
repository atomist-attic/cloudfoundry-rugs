#!/bin/bash
# replace placeholders in manifest.yml with appropriate values

set -o pipefail

declare Pkg=prep-manifest
declare Version=0.1.0

function msg () {
    echo "$Pkg: $*"
}

function err () {
    msg "$*" 1>&2
}

function main () {
    local artifact
    artifact=$(ls -1 target/*.jar | head -n 1)
    if [[ $? -ne 0 || ! $artifact ]]; then
        err "failed to determine artifact"
        return 1
    fi

    local app=${TRAVIS_REPO_SLUG##*/}

    if [[ ! $TRAVIS_TAG ]]; then
        app=$app-dev
    fi

    msg "configuring Cloud Foundry app $app with artifact $artifact"
    if ! sed -i -e "s,@NAME@,$app,g" -e "s,@PATH@,$artifact,g" manifest.yml; then
        err "failed to edit manifest.yml"
        return 1
    fi
}

main "$@" || exit 1
exit 0
