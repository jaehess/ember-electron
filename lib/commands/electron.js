'use strict';

const spawn = require('child_process').spawn;
const chalk = require('chalk');
const RSVP = require('rsvp');
const debugServer = require('../helpers/debug-server');
const getRemoteDebugSocketScript = require('../helpers/remote-debug-script');
const os = require('os');

const Promise = RSVP.Promise;

module.exports = {
    name: 'electron',
    description: 'Builds your app and launches Electron',

    init: function() {
        process.env.EMBER_CLI_ELECTRON = true;

        if (this._super && this._super.init) {
            this._super.init.apply(this, arguments);
        }
    },

    availableOptions: [{
        name: 'environment',
        type: String,
        default: 'development',
        aliases: ['e', {
            dev: 'development'
        }, {
            prod: 'production'
        }]
    }, {
        name: 'output-path',
        type: String,
        default: 'dist/',
        aliases: ['o']
    }],

    buildWatch: function(options) {
        const ui = this.ui;
        const Watcher = require('ember-cli/lib/models/watcher');
        const Builder = require('ember-cli/lib/models/builder');

        ui.startProgress(chalk.green('Building'), chalk.green('.'));

        const watcher = new Watcher({
            ui: ui,
            builder: new Builder({
                ui: ui,
                project: this.project,
                environment: options.environment,
                outputPath: options.outputPath
            }),
            analytics: this.analytics,
            options: options
        });

        return watcher;
    },

    runInspectorServer: function(options) {
        if (options.environment !== 'development') {
            return;
        }

        const port = 30820;
        const host = 'localhost';

        debugServer.setRemoteDebugSocketScript(getRemoteDebugSocketScript(port, host));
        debugServer.start(port, '0.0.0.0');

        this.ui.writeLine('--------------------------------------------------------------------');
        this.ui.writeLine(chalk.green.bold('Ember Inspector running on http://' + host + ':' + port));
        this.ui.writeLine(chalk.green('Open the inspector URL in a browser to debug the app!'));
        this.ui.writeLine(chalk.green('The inspector is also available as an addon inside your'));
        this.ui.writeLine(chalk.green('app\'s developer tools.'));
        this.ui.writeLine('--------------------------------------------------------------------');
    },

    runElectron: function() {
        const ui = this.ui;
        const project = this.project;

        return new Promise((resolve, reject) => {
            ui.writeLine(chalk.green('Starting Electron...'));
            ui.writeLine('--------------------------------------------------------------------');

            const findElectron = require('../helpers/find-electron');
            const electronCommand = findElectron(project);
            const child = spawn(electronCommand, ['.'], {
                cwd: project.root,
                stdio: 'inherit',
                shell: os.platform() === 'win32'
            });

            child.on('error', (error) => {
                if (error.code === 'ENOENT') {
                    ui.writeLine('');
                    ui.writeLine(chalk.red('Error running the following command: ' + electronCommand));
                    ui.writeLine('');
                    ui.writeLine(chalk.yellow('Either re-run the blueprint with \'ember g ember-electron\' to add Electron as an NPM dependency in your project,'));
                    ui.writeLine(chalk.yellow('or set an environment variable named \'ELECTRON_PATH\' pointing to your Electron binary.'));
                    reject();
                } else {
                    ui.writeLine(chalk.red('Error running Electron.'));
                    reject(error);
                }
            });

            child.on('exit', () => {
                ui.writeLine(chalk.green('Electron exited.'));
                resolve();
            });
        });
    },

    run: function(options) {
        return this.buildWatch(options)
            .then(() => {
                this.runInspectorServer(options);
                return this.runElectron();
            });
    }
};
