function personalizeForContact(template, contact, event) {
  const values = {
    name: contact.name || '',
    phone: contact.phone || '',
    company: contact.company || '',
    designation: contact.designation || '',
    venue: contact.venue || event?.venue || '',
    date: contact.eventDate || event?.eventDate || '',
    event_date: contact.eventDate || event?.eventDate || '',
    event_name: event?.name || '',
    link: contact.link || event?.registrationUrl || '',
    event_time: event?.eventTime || '',
  };
  let result = String(template || '');
  result = result.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) return values[key];
    const custom = contact.customFields && typeof contact.customFields === 'object' ? contact.customFields[key] : undefined;
    return custom == null ? '' : String(custom);
  });
  return result;
}
module.exports = { personalizeForContact };
