const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Search = imports.ui.search;
const St = imports.gi.St;
const Util = imports.misc.util;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const VAULT_FILE_PATH = Me.path + '/vault';

var lastPassSearchProvider = null;

var log = function(log) {
    Util.spawn([Me.path + '/log.sh', '"' + log + '"'])
}

const LastPassSearchProvider = new Lang.Class({

    Name: 'LastPassSearchProvider',

    activateResult: function(id) {
        Util.spawn(['gnome-terminal', '--hide-menubar', '--geometry=60x15', '-e', Me.path + '/display-result.sh \'' + id + '\'']);
    },

    _init: function() {
        let filename = '';

        this.title = "LastPassSearch";
        this.id = "LastPassSearch";
        this.searchSystem = null;
        this.vaultPasswords = [];

        this.appInfo = {
            get_name: function() {
                return 'google-chrome "https://lastpass.com/"';
            },
            get_icon: function() {
                return Gio.icon_new_for_string(Me.path + '/lastpass-icon.png');
            },
            get_id: function() {
                return this.id;
            }
        };

        let vaultFile = Gio.file_new_for_path(VAULT_FILE_PATH);
        this.vaultFileMonitor = vaultFile.monitor_file(Gio.FileMonitorFlags.NONE, null);
        this.vaultFileMonitor.connect('changed', Lang.bind(this, this._onVaultFileChanged));

        if (!vaultFile.query_exists(null))
            this._updateVaultFile();
        else
            this._onVaultFileChanged(null, vaultFile, null, Gio.FileMonitorEvent.CREATED);
    },

    _onVaultFileChanged: function(filemonitor, file, other_file, event_type) {
        if (!file.query_exists (null)) {
            this.vaultPasswords = [];
            this._updateVaultFile();
            return;
        }

        if (event_type == Gio.FileMonitorEvent.CREATED ||
            event_type == Gio.FileMonitorEvent.CHANGED ||
            event_type == Gio.FileMonitorEvent.CHANGES_DONE_HINT)
        {

            let content = file.load_contents(null);
            this.vaultPasswords = String(content[1]).trim().split('\n');

        }
    },

    _updateVaultFile: function() {
        Util.spawn([Me.path + '/update-vault.sh']);
        return true;
    },

    getResultMetas: function(results, callback) {
        let metas = results.map(this.getResultMeta, this);
        callback(metas);
    },

    getResultMeta: function(result) {
        resultSplit = result.split('/');
        name = resultSplit[resultSplit.length - 1];
        return {
            'id': result,
            'name': name,
            'description': result,
            'createIcon': function(size) {
                let gicon = Gio.icon_new_for_string(Me.path + '/lastpass-icon.png');
                return new St.Icon({icon_size: size, gicon: gicon});
            }
        };
    },

    filterResults: function(results, max) {
        return results;
    },

    _getResultSet: function(terms) {

        let results = [];

        for (var i=0; i<this.vaultPasswords.length; i++) {
            for (var j=0; j<terms.length; j++) {
                try {

                    if (this.vaultPasswords[i].match(terms[j]))
                        results.push(this.vaultPasswords[i]);

                }
                catch(ex) {
                    continue;
                }
            }
        }

        // Limit results to 5
        results.splice(5);

        this.searchSystem.setResults(this, results);

    },

    getInitialResultSet: function(terms) {
        return this._getResultSet(terms);
    },

    getSubsearchResultSet: function(previousResults, terms) {
        return this._getResultSet(terms);
    },
});

function init() {
}

function enable() {
    if (!lastPassSearchProvider) {
        lastPassSearchProvider = new LastPassSearchProvider();
        Main.overview.addSearchProvider(lastPassSearchProvider);
    }
}

function disable() {
    if  (lastPassSearchProvider) {
        Main.overview.removeSearchProvider(lastPassSearchProvider);
        lastPassSearchProvider.vaultFileMonitor.cancel();
        lastPassSearchProvider = null;
    }
}