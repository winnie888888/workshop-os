/*
 * Per-entity import schemas — the heart of the universal engine. Each schema
 * declares allowed fields, required fields, header synonyms (SI + EN), value
 * types, idempotent upsert keys, and relation-linking rules. Adding a new
 * importable entity = adding a schema here; nothing else in the engine changes.
 *
 * Field keys mirror the app's internal entity shapes so the confirm-step sink
 * can persist them directly (demo store now, DB later).
 */
import type { ImportSchema } from './types';

/** Stranke / podjetja. */
export const companiesSchema: ImportSchema = {
  entity: 'companies',
  label: 'Stranke / podjetja',
  description: 'Kupci in dobavitelji — podjetja in fizične osebe.',
  fields: [
    { key: 'name', label: 'Naziv', type: 'string', required: true, synonyms: ['naziv', 'ime', 'podjetje', 'company', 'customer', 'stranka', 'partner', 'naziv podjetja', 'name', 'kupec'] },
    { key: 'vatId', label: 'ID za DDV', type: 'vat_id', synonyms: ['ddv', 'davcna', 'davcna stevilka', 'id za ddv', 'vat', 'vat id', 'vatid', 'tax number', 'tax id', 'vat number'] },
    { key: 'registrationNo', label: 'Matična številka', type: 'string', synonyms: ['maticna', 'maticna stevilka', 'matica', 'registration', 'registration no', 'reg no', 'company id', 'company number'] },
    { key: 'country', label: 'Država', type: 'string', synonyms: ['drzava', 'country', 'country code', 'koda drzave'] },
    { key: 'address', label: 'Naslov', type: 'string', synonyms: ['naslov', 'address', 'ulica', 'street', 'ulica in hisna st'] },
    { key: 'city', label: 'Kraj', type: 'string', synonyms: ['kraj', 'mesto', 'city', 'town'] },
    { key: 'postCode', label: 'Poštna številka', type: 'string', synonyms: ['posta', 'postna', 'postna stevilka', 'zip', 'post code', 'postal code', 'plz'] },
    { key: 'email', label: 'E-pošta', type: 'email', synonyms: ['email', 'e-posta', 'eposta', 'mail', 'e-mail', 'elektronska posta'] },
    { key: 'phone', label: 'Telefon', type: 'phone', synonyms: ['telefon', 'tel', 'phone', 'gsm', 'mobitel', 'mobile', 'kontaktna stevilka'] },
    { key: 'contactPerson', label: 'Kontaktna oseba', type: 'string', synonyms: ['kontakt', 'kontaktna oseba', 'contact', 'contact person', 'oseba'] },
    { key: 'paymentTermsDays', label: 'Plačilni rok (dni)', type: 'integer', synonyms: ['placilni rok', 'rok placila', 'payment terms', 'terms', 'valuta dni', 'rok'] },
    { key: 'status', label: 'Status', type: 'string', synonyms: ['status', 'stanje', 'aktiven', 'active'] },
  ],
  upsertKeys: [['vatId'], ['registrationNo'], ['email'], ['name']],
};

/** Vozila. */
export const vehiclesSchema: ImportSchema = {
  entity: 'vehicles',
  label: 'Vozila',
  description: 'Vozni park — po registrski tablici, VIN ali interni oznaki.',
  fields: [
    { key: 'plate', label: 'Registrska tablica', type: 'plate', synonyms: ['tablica', 'reg', 'registrska', 'registrska tablica', 'registracija', 'plate', 'plate number', 'licence plate', 'license plate', 'oznaka'] },
    { key: 'vin', label: 'VIN / šasija', type: 'string', synonyms: ['vin', 'sasija', 'chassis', 'chassis number', 'vin stevilka', 'st sasije', 'vin number'] },
    { key: 'internalCode', label: 'Interna oznaka', type: 'string', synonyms: ['interna oznaka', 'interna sifra', 'oznaka vozila', 'internal code', 'vehicle code', 'fleet number', 'st vozila'] },
    { key: 'make', label: 'Znamka', type: 'string', synonyms: ['znamka', 'make', 'proizvajalec', 'brand', 'manufacturer'] },
    { key: 'model', label: 'Model', type: 'string', synonyms: ['model', 'izvedba', 'tip modela'] },
    { key: 'type', label: 'Vrsta', type: 'enum', enumValues: ['tractor', 'trailer', 'truck', 'van', 'car', 'bus'], synonyms: ['vrsta', 'tip vozila', 'vehicle type', 'kategorija vozila'] },
    { key: 'powertrain', label: 'Pogon', type: 'enum', enumValues: ['diesel', 'electric', 'hybrid', 'petrol', 'lpg', 'cng', 'hydrogen'], synonyms: ['pogon', 'gorivo', 'powertrain', 'fuel', 'fuel type', 'vrsta goriva'] },
    { key: 'odometer', label: 'Kilometrina', type: 'integer', synonyms: ['kilometri', 'km', 'odometer', 'kilometrina', 'mileage', 'prevozeni km', 'stanje stevca'] },
    { key: 'plateCountry', label: 'Država tablice', type: 'string', synonyms: ['drzava tablice', 'plate country', 'drzava registracije'] },
    { key: 'customerName', label: 'Stranka (lastnik)', type: 'string', synonyms: ['stranka', 'lastnik', 'podjetje', 'owner', 'customer', 'company', 'imetnik'] },
    { key: 'active', label: 'Aktivno', type: 'boolean', synonyms: ['aktivno', 'aktiven', 'active', 'v uporabi', 'status'] },
  ],
  upsertKeys: [['plate'], ['vin'], ['internalCode']],
  relations: [
    { sourceField: 'customerName', targetEntity: 'companies', matchBy: ['vatId', 'name'], assignField: 'customerId', createIfMissing: false, note: 'Vozilo se poveže z obstoječo stranko po nazivu/DDV; sicer opozorilo.' },
  ],
};

/** Artikli / storitve. */
export const productsSchema: ImportSchema = {
  entity: 'products',
  label: 'Artikli / storitve',
  description: 'Katalog delov in storitev.',
  fields: [
    { key: 'sku', label: 'Šifra (SKU)', type: 'string', synonyms: ['sku', 'sifra', 'sifra artikla', 'artikel', 'product code', 'item code', 'koda', 'koda artikla', 'kataloska st'] },
    { key: 'barcode', label: 'Črtna koda', type: 'string', synonyms: ['barcode', 'ean', 'crtna koda', 'ean code', 'ean koda', 'gtin'] },
    { key: 'name', label: 'Naziv', type: 'string', required: true, synonyms: ['naziv', 'ime', 'name', 'product name', 'naziv artikla', 'opis artikla', 'artikel'] },
    { key: 'description', label: 'Opis', type: 'string', synonyms: ['opis', 'description', 'podroben opis', 'opomba'] },
    { key: 'oemRef', label: 'OEM referenca', type: 'string', synonyms: ['oem', 'oem ref', 'oem referenca', 'kataloska stevilka', 'reference', 'ref'] },
    { key: 'priceMinor', label: 'Cena', type: 'money', synonyms: ['cena', 'price', 'prodajna cena', 'cena brez ddv', 'unit price', 'vrednost', 'mpc', 'cena eur'] },
    { key: 'vatRatePct', label: 'Stopnja DDV (%)', type: 'number', synonyms: ['ddv', 'ddv stopnja', 'stopnja ddv', 'vat', 'vat rate', 'davek', 'tax rate'] },
    { key: 'onHand', label: 'Zaloga', type: 'number', synonyms: ['zaloga', 'kolicina', 'stock', 'quantity', 'na zalogi', 'qty', 'kol'] },
    { key: 'unit', label: 'Enota', type: 'string', synonyms: ['enota', 'unit', 'em', 'me', 'merska enota'] },
    { key: 'supplier', label: 'Dobavitelj', type: 'string', synonyms: ['dobavitelj', 'supplier', 'vendor', 'proizvajalec'] },
    { key: 'supplierCode', label: 'Dobaviteljeva šifra', type: 'string', synonyms: ['dobaviteljeva sifra', 'supplier code', 'supplier product code', 'vendor code'] },
    { key: 'category', label: 'Kategorija', type: 'string', synonyms: ['kategorija', 'category', 'skupina', 'group', 'razred'] },
  ],
  upsertKeys: [['sku'], ['barcode'], ['supplierCode']],
};

/** Računi / dokumenti (osnovno). */
export const invoicesSchema: ImportSchema = {
  entity: 'invoices',
  label: 'Računi / dokumenti',
  description: 'Izdani in prejeti računi (osnovno; postavke v kasnejši fazi).',
  fields: [
    { key: 'number', label: 'Številka računa', type: 'string', required: true, synonyms: ['racun st', 'racun stevilka', 'st racuna', 'stevilka racuna', 'invoice no', 'invoice number', 'document number', 'st dokumenta', 'dokument', 'no'] },
    { key: 'supplier', label: 'Dobavitelj', type: 'string', synonyms: ['dobavitelj', 'supplier', 'izdajatelj', 'vendor'] },
    { key: 'customerName', label: 'Stranka', type: 'string', synonyms: ['stranka', 'kupec', 'customer', 'prejemnik', 'partner', 'narocnik'] },
    { key: 'issueDate', label: 'Datum izdaje', type: 'date', synonyms: ['datum', 'datum izdaje', 'date', 'invoice date', 'izdano', 'datum racuna'] },
    { key: 'dueDate', label: 'Zapadlost', type: 'date', synonyms: ['zapadlost', 'rok placila', 'due date', 'valuta', 'datum zapadlosti', 'rok'] },
    { key: 'totalNetMinor', label: 'Neto', type: 'money', synonyms: ['neto', 'net', 'osnova', 'znesek brez ddv', 'net amount', 'davcna osnova'] },
    { key: 'totalVatMinor', label: 'DDV', type: 'money', synonyms: ['ddv', 'vat', 'davek', 'vat amount', 'znesek ddv'] },
    { key: 'totalGrossMinor', label: 'Bruto', type: 'money', synonyms: ['bruto', 'gross', 'za placilo', 'skupaj', 'total', 'znesek z ddv', 'znesek', 'koncni znesek'] },
    { key: 'currency', label: 'Valuta', type: 'string', synonyms: ['valuta', 'currency', 'denarna enota'] },
    { key: 'status', label: 'Status', type: 'string', synonyms: ['status', 'placano', 'stanje', 'paid'] },
    { key: 'vehiclePlate', label: 'Vozilo (tablica)', type: 'plate', synonyms: ['vozilo', 'tablica', 'vehicle', 'reg', 'registrska'] },
    { key: 'externalId', label: 'Zunanji ID', type: 'string', synonyms: ['zunanji id', 'external id', 'ext id', 'guid', 'uuid'] },
  ],
  upsertKeys: [['number', 'supplier'], ['externalId']],
  relations: [
    { sourceField: 'customerName', targetEntity: 'companies', matchBy: ['vatId', 'name'], assignField: 'customerId', createIfMissing: false },
    { sourceField: 'vehiclePlate', targetEntity: 'vehicles', matchBy: ['plate', 'vin'], assignField: 'vehicleId', createIfMissing: false, note: 'Račun se lahko poveže z vozilom po tablici.' },
  ],
};

/** Registry of all importable entities (MVP). */
export const IMPORT_SCHEMAS: ImportSchema[] = [
  companiesSchema,
  vehiclesSchema,
  productsSchema,
  invoicesSchema,
];
