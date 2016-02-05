$(function(){
  var map = L.map('map_isochrone',{
    scrollWheelZoom : false
  }).setView([51.0, 4.4], 9);
  L.tileLayer('http://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  //Create our stations list on the basis of the iRail API
  var stations = {};
  var markers = {
    "8892007" : true,//Gent
    "8891009" : true,//Luik
    "8841004" : true,//Brugge
    "8821006" : true,//Antwerpen
    "8863008" : true,//Namur
    "8844404" : true,//Spa <3
    "8866258" : true,//Neuf-Château
    "8866001" : true,//Arlon
    "8812005" : true //Brussel Noord
  };
  
  $.get("http://api.irail.be/stations.php?format=json", function (stationslist) {
    stationslist.station.forEach(function (station) {
      var key = station["@id"].replace('http://irail.be/stations/NMBS/00','');
      stations[key] = {
        longitude : station.locationX,
        latitude : station.locationY,
        name : station.name,
        '@id' : station['@id'],
        point : new L.LatLng(station.locationY, station.locationX)
      };
      if (markers[key]) {
        markers[key] = L.marker([station.locationY, station.locationX]).addTo(map);
        markers[key].on("click", function () {
          handleClick(key, markers[key]);
        });
      }
    });
    
    var startIcon = L.icon({
      iconUrl : 'http://linkedconnections.org/images/marker-icon-start.png',
      iconRetinaUrl: 'http://linkedconnections.org/images/marker-icon-2x-start.png'
    });

    var endIcon = L.icon({
      iconUrl : 'http://linkedconnections.org/images/marker-icon-end.png',
      iconRetinaUrl: 'http://linkedconnections.org/images/marker-icon-2x-end.png'
    });

    L.Icon.Default.iconUrl = 'http://linkedconnections.org/images/marker-icon.png';
    L.Icon.Default.iconRetinaUrl = 'http://linkedconnections.org/images/marker-icon-2x.png';
    
    var planner = new window.lc.Client({"entrypoints" : ["http://belgianrail.linkedconnections.org/"]});
    var departureStop = "";
    var arrivalStop = "";
    var handleClick = function (station, marker) {
      if (departureStop === "") {
        marker.setIcon(startIcon);
        departureStop = station;
        var startTime = new Date("2015-10-01T10:00Z");
        planner.query({
          "departureStop": departureStop,
          "departureTime": startTime
        }, function (stream) {
          var drawIsochrone = function (howFarHours, color, connection) {
            var secondsFromStart = (connection.arrivalTime - startTime)/1000;              
            var howFar = (howFarHours+2)*60*60; //how far can we get in 3 hours (bug: timezone is off ny 2hours for some reason...)?
            var radius = (howFar - secondsFromStart)*1.39; //we assume 1.39m/s as a walking speed
            if (radius < 0) {
              planner.end();
            }
            L.circle(connection.arrivalStop.point, radius, {
              color: color,
              stroke : true,
              weight: 1,
              fillOpacity: 0.3,
              fillRule : "nonzero"
            }).addTo(map);
          };
          stream.on('data', function (connection) {
            if (stations[connection.arrivalStop] && stations[connection.departureStop]) {
              connection.arrivalStop = stations[connection.arrivalStop];
              connection.departureStop = stations[connection.departureStop];
              //circle for the isochrone to be drawn
              //drawIsochrone(1.5,"#779050",connection);
              drawIsochrone(2,"#7d0606",connection);
              //polyline for the path visualization
              var polyline = new L.Polyline([connection.departureStop.point, connection.arrivalStop.point], {
                color: '#3b6790',
                weight: 4,
                smoothFactor: 4
              })//.addTo(map);
            } else {
              connection.arrivalStop = {
                name : connection.arrivalStop
              };
              connection.departureStop = {
                name : connection.arrivalStop
              };
            }
          });
          
          stream.on('error', function (error) {
            console.error(error);
          });
          stream.on('end', function () {
            console.log('end of stream');
          });
        });
      }
    };

  });
});
