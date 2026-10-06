(function () {
  "use strict";

  var links = [
    { key: "rooms", href: "rooms.html", label: "Rooms" },
    { key: "arts", href: "arts-events.html", label: "Arts & Culture" },
    { key: "venues", href: "venues.html", label: "Events & Venues" },
    { key: "weddings", href: "weddings.html", label: "Weddings" },
    { key: "location", href: "index.html#location", label: "Location" }
  ];

  function activeKey() {
    var page = location.pathname.split("/").pop() || "index.html";
    if (page === "rooms.html" || page.indexOf("room-") === 0) return "rooms";
    if (page === "weddings.html") return "weddings";
    if (page === "venues.html" || page.indexOf("venue-") === 0) return "venues";
    if (page === "arts-events.html" || page === "station-story.html") return "arts";
    if (page === "index.html" && location.hash === "#location") return "location";
    return "";
  }

  function enhanceHeader(header, index) {
    var nav = header.querySelector(".wayfind");
    var brand = header.querySelector(".nameplate");
    if (!nav || !brand) return;

    var navId = "site-navigation-" + (index + 1);
    var current = activeKey();
    nav.id = navId;
    nav.setAttribute("aria-label", "Main navigation");
    nav.innerHTML = links.map(function (item) {
      var state = item.key === current ? ' aria-current="page"' : "";
      return '<a href="' + item.href + '"' + state + ">" + item.label + "</a>";
    }).join("");

    var button = document.createElement("button");
    button.className = "menu-toggle sign";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", navId);
    button.innerHTML = '<span class="menu-toggle-label">Menu</span><span class="menu-toggle-icon" aria-hidden="true"></span>';
    brand.insertAdjacentElement("afterend", button);

    function setOpen(open, restoreFocus) {
      header.classList.toggle("menu-open", open);
      button.setAttribute("aria-expanded", String(open));
      if (!open && restoreFocus) button.focus();
    }

    button.addEventListener("click", function () {
      setOpen(button.getAttribute("aria-expanded") !== "true", false);
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false, false);
    });
    header.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
        setOpen(false, true);
      }
    });
    document.addEventListener("click", function (event) {
      if (!header.contains(event.target) && button.getAttribute("aria-expanded") === "true") {
        setOpen(false, false);
      }
    });
  }

  function syncCurrentNavigation() {
    var current = activeKey();
    Array.prototype.forEach.call(document.querySelectorAll(".wayfind"), function (nav) {
      Array.prototype.forEach.call(nav.querySelectorAll("a"), function (anchor) {
        var item = links.filter(function (candidate) {
          return candidate.href === anchor.getAttribute("href");
        })[0];
        if (item && item.key === current) anchor.setAttribute("aria-current", "page");
        else anchor.removeAttribute("aria-current");
      });
    });
  }

  document.documentElement.classList.add("site-nav-ready");
  Array.prototype.forEach.call(document.querySelectorAll(".masthead, .pagehead"), enhanceHeader);
  window.addEventListener("hashchange", syncCurrentNavigation);

  // Reuse the page's booking destination; enquiry pages keep their own actions.
  var bookingLink = document.querySelector('.masthead .btn[href$="#book"], .pagehead .btn[href$="#booking-form"]');
  var mobileBooking = document.querySelector(".mobile-book");
  if (bookingLink || mobileBooking) {
    if (!mobileBooking) {
      mobileBooking = document.createElement("a");
      mobileBooking.className = "mobile-book btn btn-brass";
      mobileBooking.href = bookingLink.getAttribute("href");
      document.body.appendChild(mobileBooking);
    }
    mobileBooking.textContent = "Check availability";
    document.body.classList.add("has-mobile-booking");

    var bookingDestination = new URL(mobileBooking.href, location.href);
    var bookingTarget = bookingDestination.pathname === location.pathname && bookingDestination.hash
      ? document.getElementById(bookingDestination.hash.slice(1)) : null;
    if (bookingTarget && "IntersectionObserver" in window) {
      // Let the real form take over when it is on screen.
      new IntersectionObserver(function (entries) {
        mobileBooking.classList.toggle("is-at-booking", entries[0].isIntersecting);
      }, { threshold: 0.8 }).observe(bookingTarget.querySelector('button[type="submit"]') || bookingTarget);
    }
  }

  // Keep date-only values in the guest's local calendar, including NZ daylight time.
  function calendarDate(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function followingDay(value) {
    var parts = value.split("-").map(Number);
    return calendarDate(new Date(parts[0], parts[1] - 1, parts[2] + 1, 12));
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-booking-form]"), function (form) {
    var arrival = form.querySelector('[name="checkin"]');
    var departure = form.querySelector('[name="checkout"]');
    function updateDates() {
      var today = calendarDate(new Date());
      arrival.min = today;
      departure.min = followingDay(arrival.value && arrival.value >= today ? arrival.value : today);
    }
    updateDates();
    arrival.addEventListener("change", function () {
      updateDates();
      if (departure.value && departure.value < departure.min) departure.value = departure.min;
    });
    form.addEventListener("submit", function (event) {
      updateDates();
      if (!form.reportValidity()) event.preventDefault();
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-enquiry-form]"), function (form) {
    var dateField = form.querySelector('input[type="date"]');
    if (dateField && !dateField.min) {
      var today = new Date();
      var localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
      dateField.min = localToday.toISOString().slice(0, 10);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var lines = [];
      Array.prototype.forEach.call(form.elements, function (field) {
        if (!field.name || field.disabled || field.type === "submit") return;
        var label = field.getAttribute("data-label") || field.name;
        if (field.type === "checkbox") {
          if (field.checked) lines.push(label + ": Yes");
          return;
        }
        var value = String(field.value || "").trim();
        if (value) lines.push(label + ": " + value);
      });

      var recipient = form.getAttribute("data-recipient");
      var subject = form.getAttribute("data-subject");
      var body = "Hello Grand Central team,\n\nI would like to make an enquiry.\n\n" + lines.join("\n") + "\n\nKind regards";
      var status = form.querySelector("[data-enquiry-status]");
      if (status) status.textContent = "Your email app should open now. Review the enquiry, then press Send.";
      window.location.href = "mailto:" + recipient + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
  });
}());
