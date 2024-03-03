var select96wellsView = Backbone.View.extend({
    el: 'fieldset:has(#select-wells)',
    initialize: function() {
        var rowLabel = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        var htmlString = '';
        for (var i = 0; i < 8; i++)
            for (var j = 1; j <= 12; j++)
                htmlString += '<li class="ui-widget-content">' + rowLabel[i] + j + '</li>';

        // Render table
        $('ul', this.el).html(htmlString).selectable();

        // Render buttons
        $('#all-wells-button, #none-wells-button', this.el).button();

        // Unregister mouse stop event
        //table.data("ui-selectable")._mouseStop(null);

        // Select all wells by default
        this.onSelectall();
    },
    events: {
        'click #all-wells-button': 'onSelectall',
        'click #none-wells-button': 'onSelectnone',
        'selectablestop ul': 'onStop'
    },
    onStop: function() {
        // Disable the export button
        var selected_count = this.$el.find('.ui-selected').length;
        if (selected_count)
            $('#export-button').button('option', 'disabled', false);
        else
            $('#export-button').button('option', 'disabled', true);
    },
    onSelectall: function() {
        $('li', this.el).addClass("ui-selecting");
        $('ul', this.el).data("ui-selectable")._mouseStop();

    },
    onSelectnone: function() {
        $('li', this.el).removeClass("ui-selected").addClass("ui-unselecting");
        $('ul', this.el).data("ui-selectable")._mouseStop();
    }
});

function format_float(x, step = 0.1, sign = false) {
    factor = Math.round(1 / step);
    xn = Math.round(x * factor) / factor;

    ret = xn.toString();

    if (sign && x >= 0) ret = '+' + ret;

    if (step < 1 && Math.abs(xn - Math.floor(xn)) * 2 < step) ret += '.0';

    return ret;
}

var sliderView = Backbone.View.extend({
    options: {
        min: 0,
        max: 100,
        step: 1,
        value: 50,
        range: 'min',
        myLabel: 'exposure'
    },
    model: null,
    initialize: function(options) {
        this.options = options.options;

        // Register max value in the model
        this.model.set(this.options.myLabel + 'Max', this.options.max);
        this.model.set(this.options.myLabel, this.options.value);

        this.$el.find('.myui-slider').slider(this.options);
        this.$el.find('.myui-value').spinner(this.options).spinner('value', this.options.value);

        // Render values whenever the model changed
        this.listenTo(this.model, 'sync', this.render);
    },
    events: {
        'spin .myui-value': 'updateSlider',
        'change .myui-value': 'updateSlider',
        'slide .myui-slider': 'updateValue',
        'slidestop .myui-slider': 'updateValue',
        //'click .myui-slider': 'updateValue'
    },
    render: function() {
        var val = this.model.get(this.options.myLabel);

        // Automatically round-off values
        this.$el.find('.myui-value').spinner('value', val);

        if (this.model.get('triggeredFrom') != this.options.myLabel + '-slider')
            this.$el.find('.myui-slider').slider('value', val);
    },
    updateSlider: function() {
        var val = this.$el.find('.myui-value').spinner('value');

        // Clip value
        if (val > this.options.max)
            val = this.options.max;
        else if (val < this.options.min)
            val = this.options.min;

        // Round off value
        val = Math.round(val / this.options.step) * this.options.step;

        this.model.parse(this.options.myLabel + '-spinner', this.options.myLabel, val);
    },
    updateValue: function() {
        var val = this.$el.find('.myui-slider').slider('value');
        this.model.parse(this.options.myLabel + '-slider', this.options.myLabel, val);
    }
});

var brightnessView = Backbone.View.extend({
    el: 'fieldset:has(#brightness-slider)',
    model: null,
    initialize: function(options) {
        this.options = options.options || this.options;
        $('#brightness-slider').progressbar();
        $('#apply-exposure-button').button('option', 'disabled', true);

        this.listenTo(this.model, 'sync', this.render);
    },
    events: {
        'click #apply-exposure-button': 'onApply'
    },
    render: function() {
        var gain = this.model.get('gain');
        var exposure = this.model.get('exposure');
        var exposureMax = this.model.get('exposureMax');

        var percentage = exposure * gain * 100;
        percentage /= exposureMax * this.model.get('gainMax');
        this.$el.find('#brightness-slider').progressbar('value', percentage);

        var bestGain = Math.ceil(exposure * gain / exposureMax);
        var bestExposure = exposure * gain / bestGain;
        if (gain > 16) {
            $('.ui-progressbar-value', this.el).removeClass('myui-warning').addClass('myui-error')
            $('.progress-label', this.el).text('Warning: Pixel values are truncated at gain > 16x');
            $('#apply-exposure-button').button('option', 'disabled', false);
        } else if (gain > 1 && bestGain < gain) {
            $('.ui-progressbar-value', this.el).removeClass('myui-error').addClass('myui-warning');
            $('.progress-label', this.el).text('Warning: Suboptimal setting detected; try minimizing gain, e.g. ' +
                'exposure = ' + format_float(bestExposure, 0.1) + 'ms; gain = ' + bestGain + 'x');
            $('#apply-exposure-button').button('option', 'disabled', false);
        } else {
            $('.ui-progressbar-value', this.el).removeClass('myui-warning myui-error').text('');
            $('.progress-label', this.el).text('');
            $('#apply-exposure-button').button('option', 'disabled', true);
        }
    },
    onApply: function(event, ui) {
        event.preventDefault();

        var gain = this.model.get('gain');
        var exposure = this.model.get('exposure');
        var exposureMax = this.model.get('exposureMax');

        var bestGain = Math.ceil(exposure * gain / exposureMax);
        var bestExposure = exposure * gain / bestGain;

        this.model.set('exposure', bestExposure);
        this.model.set('gain', bestGain);
        this.model.set('triggeredFrom', 'none');
        this.model.trigger('sync', this.model, {});
    }
});

var datetimeView = Backbone.View.extend({
    el: 'fieldset:has(#datetime-value)',
    initialize: function() {
        $('#renew-datetime-button', this.el).button();
    },
    events: {
        'click #renew-datetime-button': 'renewDatetime'
    },
    renewDatetime: function(event, ui) {
        // Update date and time 
        event.preventDefault();
        var datetime = new Date();
        $('#datetime-value', this.el).val(datetime.toISOString().slice(0, -5) + 'Z');
    }
});

var deepzoomModel = Backbone.Model.extend({
    defaults: {
        datetime: 'Current',
        description: 'Demo',
        plateId: '0001',
        well: 0,
        channel: 'fluorescence',
        phase: false,
    },
    getUrl: function(datetime, autofocus_channel) {
        var url = 'api/deepzoom/';
        if (datetime)
            url += '?datetime=' + datetime;

        if (autofocus_channel == 'egfp' || autofocus_channel == 'txred')
            url += (datetime) ? '&' : '?' + 'autofocus=' + autofocus_channel;

        return url;
    },
    fetch: function(datetime, autofocus_channel = 'off') {
        var url = this.getUrl(datetime, autofocus_channel);
        var self = this;
        $.ajax({
            url: url,
            dataType: 'json',
            async: true,
            success: function(data) {
                self.set('datetime', data['datetime'].replace(/:/g, '-'));
                self.set('description', data['description']);
                self.trigger('sync', self.model, {});
            }
        });
    },
    destroy: function() {
        var url = this.getUrl(null, 'off');
        $.ajax({
            url: url,
            dataType: 'json',
            type: 'DELETE',
            async: false
        });
    },
    reload: function(datetime, autofocus_channel = 'off') {
        var url = this.getUrl(datetime, autofocus_channel);
        var self = this;
        $.ajax({
            url: url,
            dataType: 'json',
            type: 'PUT',
            async: true,
            success: function(data) {
                self.set('datetime', data['datetime'].replace(/:/g, '-'));
                self.set('description', data['description']);
                self.trigger('sync', self.model, {});
            }
        });
    }
});

var deepzoomView = Backbone.View.extend({
    el: 'body',
    model: null,
    events: {
        'click #reload-images': 'changeChannel',
        'selectmenuselect #deepzoom-layer': 'changeChannel',
        'change #render-phase': 'changeChannel',
        'selectmenuselect #deepzoom-well': 'panTo'
    },
    initialize: function(options) {
        this.viewer = options.viewer;

        $('#deepzoom-layer').selectmenu();

        var self = this;
        $('a[href="#tabs-3"]').click(function() {
            $('#clear-images').click();
            //$('#reload-images').click();

            //change_deepzoom_layer();
            open_curtain_tiles();
        });

        // Initialize well selector
        var rowLabel = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        var htmlString = '';
        for (var i = 0; i < 8; i++) {
            for (var j = 0; j < 12; j++) {
                const well_id = rowLabel[i] + (j + 1);
                const coord = [j * 2592 + 2592 / 2, i * 2592 + 1944 / 2];
                const is_selected = (i == 0 && j == 5) ? 'selected' : '';
                htmlString += `<option value="{'x':${coord[0]},'y':${coord[1]}}" ${is_selected}>${well_id}</option>`;
            }
        }

        // Pan to the selected well immediately
        this.$el.find('#deepzoom-well').html(htmlString).selectmenu().selectmenu('menuWidget').addClass('selectmenu-overflow');

        this.listenTo(this.model, 'sync', this.render);
    },
    render: function() {
        this.$el.find('#datetime2-value').val(this.model.get('datetime'));
        this.$el.find('#description2-value').val(this.model.get('description'));

        var channel = this.model.get('channel');
        var phase = this.model.get('phase');
        this.openDeepzoomtiles(channel, phase);

        open_curtain_tiles();

        // Hide loading icon
        this.toggleLoading(false);
    },
    openDeepzoomtiles: function(channel = 'raw', render_phase = true) {
        // Trick to force reload
        var tileSources = new Array(96);
        for (let row = 0; row < 8; row++)
            for (let column = 0; column < 12; column++) {
                tileSources[row * 12 + column] = {
                    tileSource: {
                        height: 1944,
                        width: 2592,
                        tileSize: 256,
                        maxLevel: 7,
                        getTileUrl: (render_phase) ?

                            function(level, x, y) {
                                if (level >= 7)
                                    return 'api/deepzoom/' + row + '/' + column + '/phase-' + level + '-' + x + '-' + y + '.jpg';
                                else
                                    return 'api/deepzoom/' + row + '/' + column + '/' + channel + '-' + level + '-' + x + '-' + y + '.jpg';
                            } :

                            function(level, x, y) {
                                return 'api/deepzoom/' + row + '/' + column + '/' + channel + '-' + level + '-' + x + '-' + y + '.jpg';
                            }
                    },
                    x: column * 2592,
                    y: row * 2592,
                    width: 2592
                };
            }
        this.viewer.open(tileSources);

        var mpp = 0.4375;
        this.viewer.scalebar({
            pixelsPerMeter: mpp ? (1e6 / mpp) : 0,
            xOffset: 20,
            yOffset: 40,
            location: 1,
            barThickness: 5,
            color: '#ff5555',
            fontColor: '#333333',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            stayInsideImage: false
        });
    },
    panTo: function() {
        var coordinate = JSON.parse(this.$el.find('#deepzoom-well').val().replace(/\'/g, '"'));

        this.viewer.viewport.panTo(coordinate, true);
        this.viewer.viewport.zoomTo(1 / 2592.0);

        open_curtain_tiles();
    },
    toggleLoading: function(state) {
        // Show loading icon
        if (state) {
            this.$el.find('#clear-images, #autofocus-images').button("disable")
            this.$el.find('#loading-icon').show();
        } else {
            this.$el.find('#clear-images, #autofocus-images').button("enable")
            this.$el.find('#loading-icon').hide();
        }
    },
    clearCache: function() {
        this.toggleLoading(true);

        var datetime = $('#export-datetime').val();
        if (datetime && datetime.match(/\d{4}-\d\d-\d\dT\d\d-\d\d-\d\dZ/))
            this.model.reload(datetime, 'off');
        else
            this.model.reload(null, 'off');

    },
    autofocus: function() {
        this.toggleLoading(true);

        var datetime = $('#export-datetime').val();

        // Focusing in eGFP channel by default
        var channel = (this.model.get('channel') == 'txred') ? 'txred' : 'egfp';

        if (datetime && datetime.match(/\d{4}-\d\d-\d\dT\d\d-\d\d-\d\dZ/))
            this.model.fetch(datetime, channel);
        else
            this.model.fetch(null, channel);

    },
    changeChannel: function() {
        var channel = $('#deepzoom-layer option:selected').val();
        var phase = $('#render-phase').is(':checked');
        this.model.set('channel', channel);
        this.model.set('phase', phase);
        this.model.trigger('sync', this.model, {});
    }
});

var deepzoomFilterModel = Backbone.Model.extend({
    defaults: {
        orientation: 0,
        gamma: 1,
        contrast: 1,
        brightness: 0,
        colormap: null,
        triggeredFrom: null
    },
    parse: function(_triggeredFrom, lvalue, rvalue) {
        this.set(lvalue, rvalue);
        this.set('triggeredFrom', _triggeredFrom);
        this.trigger('sync', this, {});
    }
});

var deepzoomFilterView = Backbone.View.extend({
    el: 'div:has(#deepzoom-filter-reset)',
    model: null,
    viewer: null,
    events: {
        'click #deepzoom-filter-reset': 'onReset',
        'selectmenuselect #deepzoom-color': 'changeColormap'
    },
    initialize: function(options) {
        this.viewer = options.viewer;
        this.$el.find('#deepzoom-color').selectmenu();

        this.listenTo(this.model, 'sync', this.render);
    },
    render: function() {
        var triggeredFrom = this.model.get('triggeredFrom');

        if (!triggeredFrom || triggeredFrom.match('orientation'))
            this.viewer.viewport.setRotation(this.model.get('orientation'));

        var brightness = this.model.get('brightness');
        var contrast = this.model.get('contrast');
        var gamma = this.model.get('gamma');
        var processors = [
            OpenSeadragon.Filters.BRIGHTNESS(brightness),
            OpenSeadragon.Filters.CONTRAST(contrast),
            OpenSeadragon.Filters.GAMMA(gamma)
        ];

        var color = this.model.get('color');
        if (color) {
            var colormap = Array(256);
            for (var i = 0; i <= 255; i++)
                colormap[i] = [color[0] * i / 255, color[1] * i / 255, color[2] * i / 255];
            processors.push(OpenSeadragon.Filters.COLORMAP(colormap, 128));

        }

        // Adjust image filters
        this.viewer.setFilterOptions({
            filters: {
                processors: processors
            },
            loadMode: 'sync'
        });
    },
    onReset: function() {
        this.model.set('orientation', 0);
        this.model.set('contrast', 1);
        this.model.set('brightness', 0);
        this.model.set('gamma', 1);

        this.$el.find('#deepzoom-color').val("{'color':null}").selectmenu('refresh');
        this.model.set('colormap', null);

        this.model.set('triggeredFrom', null);
        this.model.trigger('sync', this.model, {});
    },
    changeColormap: function() {
        var color = JSON.parse($('#deepzoom-color').val().replace(/\'/g, '"'))['color'];
        this.model.set('color', color);
        this.model.set('triggeredFrom', 'color');
        this.model.trigger('sync', this.model, {});
    }
});

function initialize_deepzoom(curtain = false) {
    var viewer = new OpenSeadragon({
        id: "view",
        prefixUrl: '../deepzoom/static/images/',
        showNavigator: false,
        showRotationControl: true,
        animationTime: 0.5,
        blendTime: 0.1,
        constrainDuringPan: true,
        preserveViewport: true,
        maxZoomPixelRatio: 2,
        visibilityRatio: 1,
        zoomPerScroll: 1.2,
        timeout: 120000,
    });

    var _deepzoomModel = new deepzoomModel();
    var _deepzoomView = new deepzoomView({
        model: _deepzoomModel,
        viewer: viewer
    });

    var _deepzoomFilterModel = new deepzoomFilterModel();
    var orientationView = new sliderView({
        el: 'p:has(#deepzoom-angle-value)',
        model: _deepzoomFilterModel,
        options: {
            min: -180,
            max: 180,
            step: 1,
            value: 0,
            myLabel: 'orientation'
        }
    });

    var _gammaView = new sliderView({
        el: 'p:has(#deepzoom-gamma-value)',
        model: _deepzoomFilterModel,
        options: {
            min: 0.1,
            max: 4,
            step: 0.1,
            value: 1,
            myLabel: 'gamma'
        }
    });

    var _contrastView = new sliderView({
        el: 'p:has(#deepzoom-contrast-value)',
        model: _deepzoomFilterModel,
        options: {
            min: 0,
            max: 4,
            step: 0.1,
            value: 1,
            myLabel: 'contrast'
        }
    });

    var _brightnessView = new sliderView({
        el: 'p:has(#deepzoom-brightness-value)',
        model: _deepzoomFilterModel,
        options: {
            min: -128,
            max: 128,
            step: 1,
            value: 0,
            myLabel: 'brightness'
        }
    });

    var _deepzoomFilterView = new deepzoomFilterView({
        model: _deepzoomFilterModel,
        viewer: viewer
    });

    return _deepzoomModel;
}

function open_curtain_tiles() {
    var render_phase = $('#render-phase').is(':checked');

    var coordinate = JSON.parse($('#deepzoom-well').val().replace(/\'/g, '"'));
    var row = Math.floor(coordinate['y'] / 2592);
    var column = Math.floor(coordinate['x'] / 2592);

    // Trick to force reload

    //viewer2.destroy(); 
    $('#curtain-view').html('');
    viewer2 = new CurtainSyncViewer({
        container: document.querySelector('#curtain-view'),
        prefixUrl: '../deepzoom/static/images/',
        images: [{
            key: 'egfp',
            shown: true,
            tileSource: {
                height: 1944,
                width: 2592,
                tileSize: 256,
                maxLevel: 7,
                getTileUrl: function(level, x, y) {
                    return 'api/deepzoom/' + row + '/' + column + '/egfp-' + level + '-' + x + '-' + y + '.jpg';
                }
            },
        }, {
            key: 'txred',
            shown: true,
            tileSource: {
                height: 1944,
                width: 2592,
                tileSize: 256,
                maxLevel: 7,
                getTileUrl: function(level, x, y) {
                    return 'api/deepzoom/' + row + '/' + column + '/txred-' + level + '-' + x + '-' + y + '.jpg';
                }
            },
        }, {
            key: 'raw',
            shown: true,
            tileSource: {
                height: 1944,
                width: 2592,
                tileSize: 256,
                maxLevel: 7,
                getTileUrl: (render_phase) ?
                    function(level, x, y) {
                        if (level >= 7)
                            return 'api/deepzoom/' + row + '/' + column + '/phase-' + level + '-' + x + '-' + y + '.jpg';
                        else
                            return 'api/deepzoom/' + row + '/' + column + '/raw-' + level + '-' + x + '-' + y + '.jpg';
                    } : function(level, x, y) {
                        return 'api/deepzoom/' + row + '/' + column + '/raw-' + level + '-' + x + '-' + y + '.jpg';
                    }
            },
        }]
    });

    // Set control toolbar
    viewer2.setMode($('#toggle-curtain').val());

    var mpp = 0.4375;
    var viewerHandle = null;
    var minWidth = '15%';
    if (viewer2.getMode() == 'curtain') viewerHandle = viewer2.mode.viewer;
    else {
        viewerHandle = viewer2.images[0].sync.viewer;
        viewerHandle2 = viewer2.images[1].sync.viewer;
        // Scalebar interferes with sync mode
        minWidth = '5%';
    }

    // DEBUG: doesn't work
    //viewerHandle.setControlsEnabled(true);

    // Set scale bar
    if (parseInt(minWidth) >= 10)
        viewerHandle.scalebar({
            viewer: viewerHandle,
            pixelsPerMeter: mpp ? (1e6 / mpp) : 0,
            xOffset: 20,
            yOffset: 40,
            location: 1,
            barThickness: 5,
            color: '#ff5555',
            fontColor: '#333333',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            stayInsideImage: false,
            minWidth: minWidth
        });

    // Set color
    if ($('#toggle-curtain-color').val() == 'true') {

        // Generate colormaps (red, green)
        var color = [
            [0, 255, 0],
            [255, 0, 0]
        ];
        var colormap = Array(2);
        for (var j = 0; j < 2; j++) {
            colormap[j] = Array(256);
            for (var i = 0; i <= 255; i++)
                colormap[j][i] = [color[j][0] * i / 255, color[j][1] * i / 255, color[j][2] * i / 255];
        }

        if (viewer2.getMode() == 'curtain') {
            // Wait for viewer.addTiledImage() to complete
            viewerHandle.addHandler('tile-loaded', function() {
                viewerHandle.setFilterOptions({
                    filters: [{
                        items: viewerHandle.world.getItemAt(0),
                        processors: OpenSeadragon.Filters.COLORMAP(colormap[0], 128)
                    }, {
                        items: viewerHandle.world.getItemAt(1),
                        processors: OpenSeadragon.Filters.COLORMAP(colormap[1], 128)
                    }],
                    loadMode: 'sync'
                });
            });
        } else {
            viewerHandle.setFilterOptions({
                filters: {
                    processors: OpenSeadragon.Filters.COLORMAP(colormap[0], 128)
                }
            });
            viewerHandle2.setFilterOptions({
                filters: {
                    processors: OpenSeadragon.Filters.COLORMAP(colormap[1], 128)
                }
            });
        }
    }

}

$(function() {
    $('button').button();

    //var _select96wellsView = new select96wellsView();
    //var _copyTextview = new copyTextview();

    //var _filelistModel = new filelistModel ();
    var _deepzoomModel = initialize_deepzoom();

    //var _filelistView = new filelistView ({
    //    filelistModel: _filelistModel,
    //    deepzoomModel: _deepzoomModel});

    $('#advanced-settings, #monitor-calibration').accordion({
        heightStyle: 'content',
        collapsible: true,
        active: false
    });

    $('#toggle-curtain, #toggle-curtain-color').selectmenu({
        change: function(event, ui) {
            open_curtain_tiles();
        }
    });

    $(document).tooltip();

    $('#reload-images').click();
});