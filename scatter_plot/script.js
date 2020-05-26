
      // Map views always need a projection.  Here we just want to map image
      // coordinates directly to map coordinates, so we create a projection that uses
      // the image extent in pixels.
      var extent = [0, 0, 2048, 1471];
      var projection = new ol.proj.Projection({
        code: 'scatter-plot',
        units: 'pixels',
        extent: extent
      });

// Custom icons
function createStyle(src, img) {
    return new ol.style.Style({
        image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
        anchor: [0.5, 0.5],
        src: src,
        img: img,
        size: img ? [img.width, img.height] : undefined
    }))
});
}

// Pad leading zeros
function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

// Map PCA coordinates
function mapto(x,y) {
    var newx = x * -669.23 + 1445.69;
    var newy = y * -625.5 + 845.5;
    return [newx, newy];
    }

// Add circle markers
var markerColor = ['red', 'green', 'blue'];
var iconMarkers = new Array(mymarker.length);
for(var i=0;i<mymarker.length;i++)
{            
    var coordxy = mapto(mymarker[i].x, mymarker[i].y);
    var image = 'icons/marker_'+markerColor[mymarker[i].group]+'.png';
    iconMarkers[i] = new ol.Feature(new ol.geom.Point(coordxy));
    iconMarkers[i].set('style', createStyle(image, undefined));
}

// Add thumbnails
var iconThumbnails = new Array(mymarker.length);
resolutionThresh = 0.5;
for(var i=0;i<mymarker.length;i++)
{            
    var coordxy = mapto(mymarker[i].x, mymarker[i].y);
    var image = 'data/'+pad(mymarker[i].id,4)+'.png';
    iconThumbnails[i] = new ol.Feature(new ol.geom.Point(coordxy));
    iconThumbnails[i].set('style', createStyle(image, undefined));
}
      
      var map = new ol.Map({
        controls: ol.control.defaults().extend([
          new ol.control.FullScreen()
        ]),
        layers: [
          new ol.layer.Image({
            source: new ol.source.ImageStatic({
              url: 'scatter_plot.svg',
              projection: projection,
              imageExtent: extent,
              bgColor: 'black'
            })
          }),
          new ol.layer.Vector({
            style: function(feature) { return feature.get('style'); },
            source: new ol.source.Vector({ features: iconMarkers}),
            minResolution: resolutionThresh,
            maxResolution: 2000
          }),
          new ol.layer.Vector({
            style: function(feature) { return feature.get('style'); },
            source: new ol.source.Vector({ features: iconThumbnails}),
            minResolution: 0.001,
            maxResolution: resolutionThresh*1.05
          })
        ],
        target: 'map',
        view: new ol.View({
          projection: projection,
          center: ol.extent.getCenter(extent),
          zoom: 2,
          maxZoom: 8
        })
      });
