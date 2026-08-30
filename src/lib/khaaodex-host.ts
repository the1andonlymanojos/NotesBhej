/** Request header the proxy sets when a request arrives on the KhaaoDex host
 *  (khao-dex.mshiv.net). Server components read it to drop the shared NotesBhej
 *  chrome. Kept in its own module so both the proxy and the app can import it. */
export const KHAAODEX_HOST_HEADER = "x-khaaodex-host"
