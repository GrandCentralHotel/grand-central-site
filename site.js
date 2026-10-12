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

  // Native horizontal scrolling also works without JavaScript or on touch screens.
  Array.prototype.forEach.call(document.querySelectorAll(".room-gallery"), function (gallery) {
    var photos = Array.prototype.slice.call(gallery.querySelectorAll("figure"));
    if (photos.length < 2) return;
    gallery.tabIndex = 0;
    var controls = document.createElement("div");
    controls.className = "room-photo-controls";
    var previous = document.createElement("button");
    previous.type = "button";
    previous.textContent = "Previous photo";
    var status = document.createElement("span");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    var next = document.createElement("button");
    next.type = "button";
    next.textContent = "Next photo";
    controls.append(previous, status, next);
    gallery.insertAdjacentElement("afterend", controls);
    var current = 0, scrollTimer;
    var thumbnails = document.createElement("div");
    thumbnails.className = "room-photo-thumbnails";
    thumbnails.setAttribute("role", "group");
    thumbnails.setAttribute("aria-label", "Choose a room photograph");
    var thumbnailButtons = photos.map(function (photo, index) {
      var image = photo.querySelector("img");
      var button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", "View photo " + (index + 1) + ": " + image.alt);
      var thumbnail = document.createElement("img");
      thumbnail.src = image.currentSrc || image.src;
      thumbnail.alt = "";
      thumbnail.width = 80; thumbnail.height = 60;
      thumbnail.loading = "lazy";
      button.appendChild(thumbnail);
      button.addEventListener("click", function () {
        current = index;
        gallery.scrollTo({ left: position(index), behavior: "auto" });
        update();
      });
      thumbnails.appendChild(button);
      return button;
    });
    controls.insertAdjacentElement("beforebegin", thumbnails);
    function position(index) { return photos[index].offsetLeft - photos[0].offsetLeft; }
    function update() {
      var nearest = 0;
      photos.forEach(function (photo, index) {
        if (Math.abs(position(index) - gallery.scrollLeft) < Math.abs(position(nearest) - gallery.scrollLeft)) nearest = index;
      });
      current = nearest;
      status.textContent = "Photo " + (current + 1) + " of " + photos.length;
      previous.disabled = current === 0;
      next.disabled = current === photos.length - 1;
      thumbnailButtons.forEach(function (button, index) {
        button.setAttribute("aria-pressed", String(index === current));
      });
    }
    function move(direction) {
      current = Math.max(0, Math.min(photos.length - 1, current + direction));
      gallery.scrollTo({ left: position(current), behavior: "auto" });
      update();
    }
    previous.addEventListener("click", function () { move(-1); });
    next.addEventListener("click", function () { move(1); });
    gallery.addEventListener("click", function () { gallery.focus({ preventScroll: true }); });
    document.addEventListener("keydown", function (event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      var target = event.target;
      var inGallery = gallery.contains(target) || controls.contains(target) || thumbnails.contains(target);
      var pageFocused = target === document.body || target === document.documentElement;
      if (!inGallery && !pageFocused) return;
      if (target.closest("input, textarea, select, a, [contenteditable]")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1);
      }
    });
    gallery.addEventListener("scroll", function () {
      clearTimeout(scrollTimer); scrollTimer = setTimeout(update, 100);
    }, { passive: true });
    window.addEventListener("resize", function () { gallery.scrollLeft = position(current); update(); });
    update();
  });

  // The mobile action follows the purpose of the current page.
  var enquiryLink = document.querySelector('.masthead .btn[href^="enquire.html"]');
  var bookingLink = enquiryLink || document.querySelector('.masthead .btn[href$="#book"], .pagehead .btn[href$="#booking-form"]');
  if (document.body.classList.contains("enquiry-page")) bookingLink = null;
  var mobileBooking = document.querySelector(".mobile-book");
  if (bookingLink || mobileBooking) {
    if (!mobileBooking) {
      mobileBooking = document.createElement("a");
      mobileBooking.className = "mobile-book btn btn-brass";
      mobileBooking.href = bookingLink.getAttribute("href");
      document.body.appendChild(mobileBooking);
    }
    mobileBooking.textContent = enquiryLink ? "Make an enquiry" : "Book a stay";
    document.body.classList.add("has-mobile-booking");

    var bookingDestination = new URL(mobileBooking.href, location.href);
    var bookingTarget = bookingDestination.pathname === location.pathname && bookingDestination.hash
      ? document.getElementById(bookingDestination.hash.slice(1)) : null;
    if (bookingTarget && "IntersectionObserver" in window) {
      // Let the real form take over when it is on screen.
      var bookingForm = bookingTarget.matches("[data-booking-form]")
        ? bookingTarget : bookingTarget.querySelector("[data-booking-form]");
      var observedTarget = bookingForm || bookingTarget.querySelector('button[type="submit"]') || bookingTarget;
      new IntersectionObserver(function (entries) {
        var entry = entries[0];
        mobileBooking.classList.toggle("is-at-booking", entry.isIntersecting && entry.intersectionRatio > 0);
      }, { threshold: bookingForm ? 0 : 0.8 }).observe(observedTarget);
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
    var summary = document.createElement("p");
    summary.className = "booking-stay-summary sign";
    summary.setAttribute("aria-live", "polite");
    form.insertBefore(summary, form.firstChild);

    var dateDisplays = [arrival, departure].map(function (input) {
      var control = document.createElement("div");
      control.className = "booking-date-control";
      var display = document.createElement("span");
      display.className = "booking-date-display";
      display.setAttribute("aria-hidden", "true");
      input.parentNode.insertBefore(control, input);
      control.appendChild(input);
      control.appendChild(display);
      input.addEventListener("click", function () {
        if (typeof input.showPicker === "function") {
          try { input.showPicker(); } catch (error) { /* Native input remains available. */ }
        }
      });
      return display;
    });

    function updateDisplay() {
      [arrival, departure].forEach(function (input, index) {
        if (!input.value) {
          dateDisplays[index].textContent = "Choose a date";
          return;
        }
        var parts = input.value.split("-").map(Number);
        var options = { weekday: "short", month: "short", day: "numeric" };
        if (parts[0] !== new Date().getFullYear()) options.year = "numeric";
        dateDisplays[index].textContent = new Date(parts[0], parts[1] - 1, parts[2], 12).toLocaleDateString("en-US", options);
      });
      // Count calendar days rather than hours so daylight-saving changes stay one night.
      function dayNumber(value) {
        var parts = value.split("-").map(Number);
        return Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000;
      }
      var nights = arrival.value && departure.value ? dayNumber(departure.value) - dayNumber(arrival.value) : 0;
      summary.textContent = nights > 0 ? nights + (nights === 1 ? " night" : " nights") : "Choose your stay dates";
    }
    function updateDates() {
      var today = calendarDate(new Date());
      arrival.min = today;
      departure.min = followingDay(arrival.value && arrival.value >= today ? arrival.value : today);
    }
    if (!arrival.value) arrival.value = calendarDate(new Date());
    if (!departure.value) departure.value = followingDay(arrival.value);
    updateDates();
    updateDisplay();
    [arrival, departure].forEach(function (input) {
      input.addEventListener("input", updateDisplay);
      input.addEventListener("change", updateDisplay);
    });
    arrival.addEventListener("change", function () {
      updateDates();
      if (!departure.value || departure.value < departure.min) departure.value = departure.min;
      updateDisplay();
    });
    // Keep room-specific links usable without JavaScript, and carry chosen dates.
    var roomLinks = Array.prototype.filter.call(document.querySelectorAll("[data-room-booking-form]"), function (link) {
      return link.getAttribute("data-room-booking-form") === form.id;
    });
    function updateRoomLinks() {
      roomLinks.forEach(function (link) {
        var url = new URL(link.href);
        ["checkin", "checkout", "adults", "currency"].forEach(function (name) {
          var input = form.querySelector('[name="' + name + '"]');
          if (input && input.value) url.searchParams.set(name, input.value);
          else url.searchParams.delete(name);
        });
        link.href = url.href;
      });
    }
    updateRoomLinks();
    form.addEventListener("input", updateRoomLinks);
    form.addEventListener("change", updateRoomLinks);
    roomLinks.forEach(function (link) {
      link.addEventListener("click", function (event) {
        updateDates();
        updateRoomLinks();
        if (!form.reportValidity()) event.preventDefault();
      });
    });
    form.addEventListener("submit", function (event) {
      updateDates();
      if (!form.reportValidity()) event.preventDefault();
    });
  });

}());
