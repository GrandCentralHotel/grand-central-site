(function () {
  "use strict";
  var form = document.getElementById("shared-enquiry");
  if (!form) return;
  var types = ["wedding", "venue", "arts", "other"];
  var sources = ["index", "rooms", "room-standard-double", "room-deluxe-king", "room-deluxe-twin", "guest-information", "station-story", "venues", "weddings", "arts-events", "enquire"];
  var venues = { "grand-hall": "Grand Hall", "grand-foyer": "Grand Foyer", "photography-studio": "Photography Studio", "meeting-room": "Meeting Room", "waiting-room": "Waiting Room", "art-share-space": "Art Share Space" };
  Object.keys(venues).forEach(function (key) { sources.push("venue-" + key); });
  var params = new URLSearchParams(location.search);
  var type = form.elements.type;
  type.value = types.indexOf(params.get("type")) >= 0 ? params.get("type") : "";
  var source = sources.indexOf(params.get("source")) >= 0 ? params.get("source") : "enquire";
  var venue = params.get("venue");
  if (!Object.prototype.hasOwnProperty.call(venues, venue) || source !== "venue-" + venue) venue = "";
  var context = document.getElementById("enquiry-context");
  function updateContext() {
    if (type.value !== "venue" && type.value !== "wedding") venue = "";
    context.hidden = !venue;
    context.textContent = venue ? "Enquiring about: " + venues[venue] : "";
  }
  updateContext();
  type.addEventListener("change", updateContext);
  var config = window.GRAND_CENTRAL_ENQUIRY || {};
  var button = form.querySelector('[type="submit"]');
  var status = document.getElementById("enquiry-status");
  var available = false;
  try {
    var endpoint = new URL(config.endpoint);
    available = config.verified === true && endpoint.origin === "https://formspree.io" && /^\/f\/[a-zA-Z0-9]+$/.test(endpoint.pathname) && !endpoint.search && !endpoint.hash && !endpoint.username && !endpoint.password && !!config.privacyPolicy && new URL(config.privacyPolicy, location.href).protocol === "https:";
  } catch (error) { /* Disconnected until trusted configuration is complete. */ }
  if (available) {
    button.disabled = false;
    button.textContent = "Send enquiry";
    var privacy = document.createElement("p");
    privacy.id = "enquiry-privacy";
    var link = document.createElement("a");
    link.href = config.privacyPolicy;
    link.textContent = "Formspree privacy policy";
    privacy.append("Your details are sent through Formspree to the Auckland Heritage Art Centre team to respond to your enquiry. Please do not include payment details or sensitive information. ", link);
    form.insertBefore(privacy, form.querySelector(".enquiry-actions"));
  }
  var fields = Array.prototype.slice.call(form.elements).filter(function (field) { return field.name && field.name !== "_gotcha"; });
  fields.forEach(function (field) {
    var error = document.createElement("span");
    error.id = field.id + "-error";
    error.className = "enquiry-error";
    field.setAttribute("aria-describedby", error.id);
    field.insertAdjacentElement("afterend", error);
    field.addEventListener("input", function () { field.removeAttribute("aria-invalid"); error.textContent = ""; });
  });
  var sending = false;
  var received = false;
  var previousPayload = "", submissionId = "";
  function showServiceErrors(errors) {
    var first;
    errors.forEach(function (error) {
      var field = fields.find(function (field) { return field.name === error.field; });
      if (!field) return;
      field.setAttribute("aria-invalid", "true");
      document.getElementById(field.id + "-error").textContent = typeof error.message === "string" ? error.message : "Please check this field.";
      if (!first) first = field;
    });
    if (first) first.focus();
    return !!first;
  }
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!available || sending || received) return;
    var firstInvalid;
    fields.forEach(function (field) {
      var invalid = !field.validity.valid || (field.required && !field.value.trim());
      document.getElementById(field.id + "-error").textContent = invalid ? (field.validity.valid ? "Please complete this field." : field.validationMessage) : "";
      field.setAttribute("aria-invalid", String(invalid));
      if (invalid && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) { status.textContent = "Please check the highlighted fields."; firstInvalid.focus(); return; }
    sending = true;
    button.disabled = true;
    form.setAttribute("aria-busy", "true");
    status.textContent = "Sending your enquiry…";
    var payload = {};
    fields.forEach(function (field) {
      var value = field.value.trim();
      // Formspree's optional numeric validation expects an absent value, not "".
      if (field.name !== "people" || value) payload[field.name] = value;
    });
    payload.source = source;
    payload.venue = venue;
    var fingerprint = JSON.stringify(payload);
    if (fingerprint !== previousPayload) {
      submissionId = crypto.randomUUID();
      previousPayload = fingerprint;
    }
    payload.submissionId = submissionId;
    payload._gotcha = form.elements._gotcha.value;
    payload.subject = "Grand Central enquiry — " + type.options[type.selectedIndex].text;
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var response = await fetch(config.endpoint, { method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal, credentials: "omit" });
      var result = await response.json();
      if (!response.ok || result.ok === false || (Array.isArray(result.errors) && result.errors.length)) {
        var fieldErrors = showServiceErrors(Array.isArray(result.errors) ? result.errors : []);
        status.textContent = fieldErrors ? "Please check the highlighted fields. Your details are still here." : response.status === 429 ? "Please wait a moment before trying again. Your details are still here, or you can call 09 365 1428." : "We could not send your enquiry. Your details are still here. Please retry or call 09 365 1428.";
        button.disabled = false;
        button.textContent = "Retry enquiry";
        return;
      }
      status.textContent = "Thank you. Your enquiry has been received. The team will be in touch. This is not a confirmed booking.";
      received = true;
      fields.forEach(function (field) { field.disabled = true; });
      button.textContent = "Enquiry received";
    } catch (error) {
      status.textContent = "We could not confirm receipt. Your details are still here. The team may already have received your enquiry; retrying could send a duplicate. Please retry or call 09 365 1428.";
      button.disabled = false;
      button.textContent = "Retry enquiry";
    } finally { clearTimeout(timeout); sending = false; form.removeAttribute("aria-busy"); }
  });
}());
