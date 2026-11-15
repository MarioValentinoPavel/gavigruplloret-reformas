// Datos del negocio. Lo que está vacío no se muestra en la web.
// email: el dominio gavigruplloretreformas.es no tiene registros MX (15-11-2026), así que info@ no recibe correo.
//        Cuando el cliente confirme un correo que funcione, ponlo aquí y aparecerá «Enviar por correo».
// whatsapp: solo números con prefijo (p. ej. '34600000000') cuando confirmen que tienen WhatsApp.
window.SITE = {
  name: 'Gavigruplloret Reformas',
  phone: '+34872220371',
  phoneLabel: '872 22 03 71',
  email: '',
  whatsapp: '',
  instagram: 'https://www.instagram.com/gavigrup/',
  instagramDM: 'https://ig.me/m/gavigrup',
  facebook: 'https://www.facebook.com/p/Gavigruplloret-Reformas-100089259307644/',
  tz: 'Europe/Madrid',
  // horario de Google: lunes a sábado de 9:00 a 19:00, domingo cerrado (0 = domingo)
  hours: { 1: [9, 19], 2: [9, 19], 3: [9, 19], 4: [9, 19], 5: [9, 19], 6: [9, 19] }
};
