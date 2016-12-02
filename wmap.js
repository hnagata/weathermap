(function($) {
	var GOOGLE_API_KEY = "AIzaSyDqaaheRj_KJ_AOw01eERIOP05wxtC-LWE";
	var OWM_API_KEY = "abb2876a6efb2b081ce45f87ec99198e";

	var GOOGLE_MAP_JS = 
		"https://maps.googleapis.com/maps/api/js?key=" + GOOGLE_API_KEY;
	var GEOCODING_API = "https://maps.googleapis.com/maps/api/geocode/json";
	var OWM_FORCAST_API = "http://api.openweathermap.org/data/2.5/forecast";
	var ICON_DIR = "icon/";  // "http://openweathermap.org/img/w/";

	var DEFAULT_CENTER_POS = {latitude: 34.802425, longitude: 135.769505};
	var ICON_SIZE = 80;
	var WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
	var NUM_TICKS = 40;

	var g = {data: {}, markers: {}, selectedTime: null};

	function padZero(x) {
		return x < 10 ? "0" + x : x;
	}

	function roundTime(t, i, span, off) {
		return new Date(Math.ceil((t.getTime() - off) / span + i) * span + off);
	}

	function getTickTime(t, i) {
		return roundTime(t, i, 3 * 3600 * 1000, 0);
	}

	function getHeadTime(t, i) {
		return roundTime(t, i, 12 * 3600 * 1000, 9 * 3600 * 1000);
	}

	function getCurrentPosition() {
		var deferred = $.Deferred();
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function(position) {
				deferred.resolve(position.coords);
			}, function (error) {
				deferred.reject(error.code);
			});
		} else {
			deferred.reject();
		}
		return deferred.promise();
	}

	function createDatePane(t) {
		var wd = WEEKDAY_LABELS[t.getDay()];
		return $("<div>").addClass("date-pane")
			.text((t.getMonth() + 1) + "月" + t.getDate() + "日(" + wd + ")");
	}

	function createTimePane(t, min) {
		return $("<div>").addClass("time-pane")
			.text(t.getHours() + (min ? ":" + padZero(t.getMinutes()) : ""));
	}

	function updateMarker(cityId) {
		var t = g.selectedTime.getTime() / 1000;
		var targets = g.data[cityId].list.filter(function(e) {return e.dt == t;});
		var iconId = targets.length >= 1 ? targets[0].weather[0].icon : "q";
		g.markers[cityId].setIcon({
			url: ICON_DIR + iconId + ".png",
			scaledSize: new google.maps.Size(ICON_SIZE, ICON_SIZE),
			anchor: new google.maps.Point(ICON_SIZE / 2, ICON_SIZE / 2)
		});
	}

	function setSelectedTime(elem) {
		var t = new Date(elem.data("timestamp"));
		g.selectedTime = t;

		// Update selected status in DOM
		$(".head-list .head-item")
			.add(".date-list .date-item")
			.add(".time-list .time-item")
			.removeClass("selected");
		elem.add(elem.parents(".date-item")).addClass("selected");

		// Update all markers
		for (var cityId in g.data) {
			updateMarker(cityId);
		}
	}

	function init() {
		// Load map
		g.map = new google.maps.Map($("#map")[0], {
			center: {lat: g.pos.latitude, lng: g.pos.longitude},
			zoom: 10,
			clickableIcons: false,
			disableDefaultUI: true,
		});
		g.map.addListener("click", onMapClicked);

		// Set up head items
		var now = g.now = new Date();
		var headList = $(".head-list");
		for (var i = 0; i < 2; ++i) {
			var t = getHeadTime(now, i);
			$("<div>").addClass("head-item")
				.append(createDatePane(t)).append(createTimePane(t, true))
				.data("timestamp", t.getTime()).click(onTimeButtonClicked)
				.appendTo(headList);
		}

		// Set up tick items
		var dateList = $(".date-list");
		var timeList = null;
		for (var i = 0; i < NUM_TICKS; ++i) {
			var t = getTickTime(now, i);
			if (!timeList || t.getHours() == 0) {
				timeList = $("<div>").addClass("time-list");
				$("<div>").addClass("date-item")
					.addClass("wday" + t.getDay())
					.append(createDatePane(t))
					.append(timeList)
					.appendTo(dateList);
			}
			$("<div>").addClass("time-item")
				.data("timestamp", t.getTime()).click(onTimeButtonClicked)
				.append(createTimePane(t, false))
				.appendTo(timeList);
		}

		// Set selectedTime to first head
		setSelectedTime($(".head-list .head-item:first"));
	}

	function onMapClicked(event) {
		$.getJSON(OWM_FORCAST_API, {
			lat: event.latLng.lat(), lon: event.latLng.lng(),
			APPID: OWM_API_KEY
		}).then(function(data) {
			var cityId = data.city.id;
			if (!(cityId in g.data)) {
				g.data[cityId] = data;
				g.markers[cityId] = new google.maps.Marker({
					position: {lat: data.city.coord.lat, lng: data.city.coord.lon},
					map: g.map,
				});
			}
			updateMarker(cityId);
		}, function(error) {
			console.log(error);
		});
	}

	function onTimeButtonClicked(event) {
		setSelectedTime($(this));
	}

	$(document).ready(function() {
		$.when($.getScript(GOOGLE_MAP_JS))
			.then(getCurrentPosition)
			.then(
				function(pos) {g.pos = pos;},
				function() {g.pos = DEFAULT_CENTER_POS})
			.then(init);
	});
})(jQuery);
