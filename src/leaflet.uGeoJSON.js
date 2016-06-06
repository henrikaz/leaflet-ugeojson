L.UGeoJSONLayer = L.GeoJSON.extend({
  _container: null,
  options: {
    debug: false,
    light: true,
    endpoint: "-1",
    parameters: {},
    maxRequests: 5,
    pollTime: 0,
    once: false,
    map: null,
    before: function (data) {
    },
    after: function (data) {
    }
  },
  
  callback: function (data) {
    this.options.before(data);
    
    if (this.options.light) {
      this.clearLayers();
    }
    
    this.addData(data);
    this.fire('data:loaded');
    this.options.after(data);
  },

  initialize: function (options) {
    L.Util.setOptions(this, options);
    this._layers = {};
    this._layersOld = [];
    this._requests = [];
    this._container = this.options.map;
    
    if (this._container) {
      this.onMoveEnd();
      this.onDrag(this._container);
    }
  },

  onMoveEnd: function () {
    if (this.options.debug) {
      console.debug("load Data");
    }

    this.fire('data:load');

    while (this._requests.length > this.options.maxRequests) {
      this._requests.shift().abort();
    }

    var postData = new FormData();

    for (var k in this.options.parameters) {
      if (this.options.parameters[k].scope != undefined) {
        postData.append(k, this.options.parameters[k].scope[k]);
      } else {
        postData.append(k, this.options.parameters[k]);
      }
    }

    var bounds = this._container.getBounds();

    postData.append('zoom', this._container.getZoom());
    postData.append('south', bounds.getSouth());
    postData.append('north', bounds.getNorth());
    postData.append('east', bounds.getEast());
    postData.append('west', bounds.getWest());

    var self = this;
    var request = new XMLHttpRequest();

    request.open("POST", this.options.endpoint, true);
    request.setRequestHeader("Accept", "application/json");
    request.onload = function () {
      for (var i in self._requests) {
        if (self._requests[i] === request) {
          self._requests.splice(i, 1);
          break;
        }
      }

      if (this.status >= 200 && this.status < 400) {
        self.callback(JSON.parse(this.responseText));
      }
    };

    this._requests.push(request);
    request.send(postData);
  },

  onAdd: function (map) {
    this._map = this._container = map;

    if (this.options.endpoint.indexOf("http") != -1) {
      this.onMoveEnd();
      this.onDrag(this._map);
    }

    if (this.options.debug) {
      console.debug("add layer");
    }
  },

  onRemove: function (map) {
    if (this.options.debug) {
      console.debug("remove layer");
    }

    L.LayerGroup.prototype.onRemove.call(this, map);

    if (!this.options.once && this.options.pollTime > 0) {
      window.clearInterval(this.intervalID);
    }

    while (this._requests.length > 0) {
      this._requests.shift().abort();
    }

    if (!this.options.once) {
      map.off({'dragend': this.onMoveEnd}, this);
      map.off({'zoomend': this.onMoveEnd}, this);
    }

    this._map = null;
  },

  onDrag: function (map) {
    if (!this.options.once) {
      map.on('dragend', this.onMoveEnd, this);
      map.on('zoomend', this.onMoveEnd, this);

      if (this.options.pollTime > 0) {
        this.intervalID = window.setInterval(this.onMoveEnd, this.options.pollTime);
      }
    }
  }
});

L.uGeoJSONLayer = function (options) {
  return new L.UGeoJSONLayer(options);
};
