(function () {
  "use strict";

  // Offer a webmail fallback before asking the browser to launch an email app.
  var emailOptions;
  function showEmailOptions(recipient, subject, body) {
    if (!emailOptions) {
      emailOptions = document.createElement("dialog");
      emailOptions.className = "email-handoff";
      emailOptions.setAttribute("aria-labelledby", "email-handoff-title");
      emailOptions.innerHTML = '<button type="button" class="email-handoff-close sign">Close</button>' +
        '<h2 id="email-handoff-title">Email the team</h2>' +
        '<p>Choose how to write to us. Review your message and press Send in your email service.</p>' +
        '<p class="email-handoff-address"></p>' +
        '<label class="email-handoff-message">Your prepared message<textarea readonly rows="6"></textarea></label>' +
        '<div class="email-handoff-actions"><a class="btn btn-brass" data-email-gmail target="_blank" rel="noopener noreferrer">Open Gmail</a>' +
        '<a class="text-link sign" data-email-app>Open email app</a>' +
        '<button class="text-link sign" type="button" data-email-copy>Copy email address</button></div>' +
        '<p class="email-handoff-status" role="status"></p>';
      document.body.appendChild(emailOptions);
      emailOptions.querySelector(".email-handoff-close").addEventListener("click", function () { emailOptions.close(); });
      emailOptions.addEventListener("click", function (event) {
        if (event.target !== emailOptions) return;
        var bounds = emailOptions.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) emailOptions.close();
      });
      emailOptions.querySelector("[data-email-copy]").addEventListener("click", function () {
        var status = emailOptions.querySelector(".email-handoff-status");
        function fallback() { status.textContent = "Select and copy the email address or prepared message above."; }
        if (!navigator.clipboard) { fallback(); return; }
        navigator.clipboard.writeText(emailOptions.copyText).then(function () {
          status.textContent = "Copied. Paste it into your email service to write to the team.";
        }, fallback);
      });
    }
    subject = subject || "";
    body = body || "";
    emailOptions.querySelector(".email-handoff-address").textContent = recipient;
    emailOptions.querySelector("[data-email-gmail]").href = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(recipient) + "&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    emailOptions.querySelector("[data-email-app]").href = "mailto:" + recipient + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    emailOptions.querySelector(".email-handoff-message").hidden = !body;
    emailOptions.querySelector("textarea").value = body ? "To: " + recipient + "\nSubject: " + subject + "\n\n" + body : "";
    emailOptions.copyText = body ? emailOptions.querySelector("textarea").value : recipient;
    emailOptions.querySelector("[data-email-copy]").textContent = body ? "Copy enquiry" : "Copy email address";
    emailOptions.querySelector(".email-handoff-status").textContent = "Nothing has been sent. Gmail may ask you to sign in.";
    if (!emailOptions.open) emailOptions.showModal();
    emailOptions.querySelector("[data-email-gmail]").focus();
  }
  document.addEventListener("click", function (event) {
    var link = event.target.closest('a[href^="mailto:"]');
    if (!link || link.hasAttribute("data-email-app") || event.defaultPrevented) return;
    event.preventDefault();
    var email = new URL(link.href);
    showEmailOptions(decodeURIComponent(email.pathname), email.searchParams.get("subject"), email.searchParams.get("body"));
  });

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
    gallery.addEventListener("keydown", function (event) {
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
  var enquiryLink = document.querySelector('.masthead .btn[href="#venue-enquiry"], .masthead .btn[href="#wedding-enquiry"]');
  var bookingLink = enquiryLink || document.querySelector('.masthead .btn[href$="#book"], .pagehead .btn[href$="#booking-form"]');
  var mobileBooking = document.querySelector(".mobile-book");
  if (bookingLink || mobileBooking) {
    if (!mobileBooking) {
      mobileBooking = document.createElement("a");
      mobileBooking.className = "mobile-book btn btn-brass";
      mobileBooking.href = bookingLink.getAttribute("href");
      document.body.appendChild(mobileBooking);
    }
    mobileBooking.textContent = enquiryLink ? "Make an enquiry" : "Check availability";
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

    function openEnquiryDraft(useGmail) {
      if (!form.reportValidity()) return;
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
      if (useGmail) {
        window.open("https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(recipient) + "&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body), "_blank", "noopener,noreferrer");
        if (status) status.textContent = "A Gmail draft should open in a new tab. Review it and press Send to submit your enquiry.";
      } else {
        showEmailOptions(recipient, subject, body);
        if (status) status.textContent = "Choose Gmail, your email app, or copy your prepared enquiry. Review it and press Send in your email service.";
      }
    }
    var gmailButton = document.createElement("button");
    gmailButton.type = "button";
    gmailButton.className = "text-link sign";
    gmailButton.textContent = "Use Gmail";
    gmailButton.addEventListener("click", function () { openEnquiryDraft(true); });
    var actions = form.querySelector(".enquiry-actions");
    if (actions) actions.insertBefore(gmailButton, actions.querySelector(".enquiry-note"));
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      openEnquiryDraft(false);
    });
  });
}());
