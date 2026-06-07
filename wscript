#
# This file is the default set of rules to compile a Pebble application.
#
# Feel free to customize this to your needs.
#
import json
import os.path

top = '.'
out = 'build'


def generate_config_html(ctx):
    """Bake src/common/config.html into the ES5 module src/common/config-html.js.

    The phone has no filesystem, so the settings page has to ship as a JS string.
    We author it as a real .html file (editor highlighting, formatters, no quote
    escaping) and generate the module here, into the source tree, so pkjs's
    require("../common/config-html") keeps resolving and the src/common/**/*.js
    bundle glob below picks it up. The generated file is git-ignored; never edit
    it by hand."""
    html = ctx.path.find_node('src/common/config.html').read()
    out_node = ctx.path.make_node('src/common/config-html.js')
    out_node.write(
        '// GENERATED from config.html by wscript. Do not edit; edit config.html.\n'
        '// pkjs replaces the __CONFIG__ token with encodeURIComponent(currentConfigJSON)\n'
        '// before opening it. On Save the page returns the new config via pebblejs://close.\n'
        'module.exports = { CONFIG_HTML: ' + json.dumps(html) + ' };\n'
    )


def options(ctx):
    ctx.load('pebble_sdk')


def configure(ctx):
    """
    This method is used to configure your build. ctx.load(`pebble_sdk`) automatically configures
    a build for each valid platform in `targetPlatforms`. Platform-specific configuration: add your
    change after calling ctx.load('pebble_sdk') and make sure to set the correct environment first.
    Universal configuration: add your change prior to calling ctx.load('pebble_sdk').
    """
    ctx.load('pebble_sdk')


def build(ctx):
    ctx.load('pebble_sdk')

    # Regenerate config-html.js before the bundle glob below scans src/common.
    generate_config_html(ctx)

    build_worker = os.path.exists('worker_src')
    binaries = []

    cached_env = ctx.env
    for platform in ctx.env.TARGET_PLATFORMS:
        ctx.env = ctx.all_envs[platform]
        ctx.set_group(ctx.env.PLATFORM_NAME)
        app_elf = '{}/pebble-app.elf'.format(ctx.env.BUILD_DIR)
        ctx.pbl_build(source=ctx.path.ant_glob('src/c/**/*.c'), target=app_elf, bin_type='app')

        if build_worker:
            worker_elf = '{}/pebble-worker.elf'.format(ctx.env.BUILD_DIR)
            binaries.append({'platform': platform, 'app_elf': app_elf, 'worker_elf': worker_elf})
            ctx.pbl_build(source=ctx.path.ant_glob('worker_src/c/**/*.c'),
                          target=worker_elf,
                          bin_type='worker')
        else:
            binaries.append({'platform': platform, 'app_elf': app_elf})
    ctx.env = cached_env

    ctx.set_group('bundle')
    ctx.pbl_bundle(binaries=binaries,
                   js=ctx.path.ant_glob(['src/pkjs/**/*.js',
                                         'src/pkjs/**/*.json',
                                         'src/common/**/*.js']),
                   js_entry_file='src/pkjs/index.js')
