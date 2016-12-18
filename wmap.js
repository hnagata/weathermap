(function($) {
	var GOOGLE_API_KEY = "AIzaSyDqaaheRj_KJ_AOw01eERIOP05wxtC-LWE";
	var GOOGLE_MAP_JS = "https://maps.googleapis.com/maps/api/js";

	var OWM_API_KEY = "abb2876a6efb2b081ce45f87ec99198e";
	var OWM_FORCAST_API = "http://api.openweathermap.org/data/2.5/forecast";
	
	var ICON_DIR = "icon/";  // "http://openweathermap.org/img/w/";

	var WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
	var DEFAULT_MAP_POS = {latitude: 34.802425, longitude: 135.769505};
	var ICON_SIZE = 80;
	var NUM_TICKS = 40, TICK_SPAN = 3;

	var g = {data: {}, markers: {}, selectedDateTimeItem: $()};

	function padZero(x) {
		return x < 10 ? "0" + x : x;
	}

	function getTickTime(t, i) {
		var h = (Math.floor(t.getHours() / TICK_SPAN) + i + 1) * TICK_SPAN;
		return new Date(t.getFullYear(), t.getMonth(), t.getDate(), h);
	}

	function getIconName(data) {
		if (data === undefined) return "q";
		// Modify icons
		var wid = data.weather[0].id;
		if (wid >= 501 && wid <= 504) return "09d";      // Rainy (>= 2.5mm/h)?
		if (wid == 500 || wid == 520) {                  // Rain/shower (< 2.5mm/h)?
			return data.clouds.all < 50 ? "10d2" : "10d";  // Clouds rate < 50%?
		}
		return data.weather[0].icon;
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

	function createDateTimeItem(t) {
		var wday = WEEKDAY_LABELS[t.getDay()];
		var datePane = $("<div>").addClass("date-pane")
			.text((t.getMonth() + 1) + "月" + t.getDate() + "日(" + wday + ")");
		var timePane = $("<div>").addClass("time-pane")
			.append(t.getHours())
			.append($("<span>").addClass("min").text(":" + padZero(t.getMinutes())));
		return $("<div>").addClass("datetime-item")
			.append(datePane).append(timePane);
	}

	function updateMarker(cityId) {
		var t = g.selectedDateTimeItem.data("timestamp") / 1000;
		var target = g.data[cityId].list.filter(function(e) {return e.dt == t;})[0];
		g.markers[cityId].setIcon({
			url: ICON_DIR + getIconName(target) + ".png",
			scaledSize: new google.maps.Size(ICON_SIZE, ICON_SIZE),
			anchor: new google.maps.Point(ICON_SIZE / 2, ICON_SIZE / 2)
		});
	}

	function updateScrollPosition(anim) {
		var itemWidth = $(".datetime-item:not(.selected)").outerWidth();
		var index = $(".datetime-item").index(g.selectedDateTimeItem);
		var ctrl = $(".datetime-ctrl").stop(true);
		if (anim) {
			ctrl.animate({scrollLeft: index * itemWidth});
		} else {
			ctrl.scrollLeft(index * itemWidth);
		}
	}

	function setSelectedDateTimeItem(item) {
		if (g.selectedDateTimeItem == item) return;
		var prevItem = g.selectedDateTimeItem;
		g.selectedDateTimeItem = item;

		// Update selected status in DOM
		prevItem.removeClass("selected");
		item.addClass("selected");

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
			mapTypeControl: false,
			streetViewControl: false
		});
		g.map.addListener("click", onMapClicked);

		// Set up datetime items
		var now = new Date();
		var ctrl = $(".datetime-ctrl");
		$("<div>").addClass("datetime-spacer").appendTo(ctrl);
		var dateItem = null;
		for (var i = 0; i < NUM_TICKS; ++i) {
			var t = getTickTime(now, i);
			if (dateItem == null || t.getHours() == 0) {
				dateItem = $("<div>").addClass("date-item")
					.addClass("wday" + t.getDay())
					.appendTo(ctrl);
			}
			createDateTimeItem(t)
				.data("timestamp", t.getTime())
				.click(onDateTimeItemClicked)
				.appendTo(dateItem);
		}
		$("<div>").addClass("datetime-spacer").appendTo(ctrl);

		// Set selectedTime to first item
		setSelectedDateTimeItem($(".datetime-item:first"));
		updateScrollPosition(false);
	}

	function onMapClicked(event) {
		$.getJSON(OWM_FORCAST_API, {
			lat: event.latLng.lat(), lon: event.latLng.lng(),
			APPID: OWM_API_KEY
		}).then(function(data) {
			var cityId = data.city.id;
			if (!(cityId in g.data)) {
				g.data[cityId] = data;
				var marker = g.markers[cityId] = new google.maps.Marker({
					position: {lat: data.city.coord.lat, lng: data.city.coord.lon},
					map: g.map,
				});
				marker.addListener("click", function() {onMarkerClicked(cityId);});
			}
			updateMarker(cityId);
		}, function(error) {
			console.log(error);
		});
	}

	function onMarkerClicked(cityId) {
		g.markers[cityId].setMap(null);
		delete g.data[cityId];
		delete g.markers[cityId];
	}

	function onDateTimeItemClicked(event) {
		setSelectedDateTimeItem($(this));
		updateScrollPosition(true);
	}

	function onControlScrolled(event) {
		var ctrl = $(".datetime-ctrl");
		if (ctrl.is(":animated")) return;
		var itemWidth = $(".datetime-item:not(.selected)").outerWidth();
		var index = Math.floor(ctrl.scrollLeft() / itemWidth + 0.5);
		setSelectedDateTimeItem($($(".datetime-item")[index]));
	}

	$(document).ready(function() {
		$(".datetime-ctrl").scroll(onControlScrolled);
		$.when($.getScript(GOOGLE_MAP_JS + "?key=" + GOOGLE_API_KEY))
			.then(getCurrentPosition)
			.then(
				function(pos) {g.pos = pos;},
				function() {g.pos = DEFAULT_MAP_POS;})
			.then(init);
	});
})(jQuery);
