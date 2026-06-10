import { LegalPage } from '@/components/marketing';

export const metadata = { title: 'Pogodba o obdelavi podatkov (DPA) — A-SPRINT GARAGE' };

export default function DpaPage() {
  return (
    <LegalPage title="Pogodba o obdelavi osebnih podatkov (DPA)" updated="10. 6. 2026">
      <p>
        Ta pogodba po členu 28 GDPR je sestavni del Pogojev uporabe in se sklene med naročnikom
        (upravljavec) in Ponudnikom (obdelovalec) z registracijo računa.
      </p>
      <h2>1. Predmet, trajanje, narava in namen obdelave</h2>
      <p>
        Obdelovalec za upravljavca obdeluje osebne podatke izključno za zagotavljanje Storitve
        (vodenje delavnice: stranke, kontakti, vozila, delovni nalogi, dokumenti, komunikacija) za
        čas trajanja naročniškega razmerja.
      </p>
      <h2>2. Vrste podatkov in posamezniki</h2>
      <ul>
        <li>Posamezniki: stranke in kontaktne osebe naročnika, vozniki, zaposleni naročnika.</li>
        <li>Podatki: identifikacijski in kontaktni podatki, podatki o vozilih in storitvah, evidence delovnega časa zaposlenih, vsebina dokumentov, ki jih naloži naročnik.</li>
      </ul>
      <h2>3. Navodila upravljavca</h2>
      <p>
        Obdelovalec obdeluje podatke samo po dokumentiranih navodilih upravljavca (uporaba Storitve
        in ta DPA). Če meni, da navodilo krši predpise, upravljavca nemudoma opozori.
      </p>
      <h2>4. Zaupnost in varnost (čl. 32)</h2>
      <p>
        Osebe, pooblaščene za obdelavo, so zavezane k zaupnosti. Obdelovalec izvaja ustrezne
        tehnične in organizacijske ukrepe: ločenost najemnikov na ravni baze (RLS), šifriranje
        prenosa, nadzor dostopa po načelu najmanjših privilegijev, revizijsko sled in varnostne
        kopije.
      </p>
      <h2>5. Podobdelovalci</h2>
      <p>
        Upravljavec daje splošno pisno dovoljenje za vključitev podobdelovalcev (gostovanje v EU,
        Stripe za plačila, Resend za e-pošto, AI ponudniki z EU rezidenčnostjo). Veljaven seznam je
        objavljen pri Politiki zasebnosti; o nameravanih spremembah obdelovalec obvesti vnaprej in
        omogoči ugovor.
      </p>
      <h2>6. Pomoč upravljavcu</h2>
      <p>
        Obdelovalec ob upoštevanju narave obdelave pomaga upravljavcu pri izpolnjevanju zahtev
        posameznikov (pravice iz poglavja III GDPR) ter obveznosti iz členov 32–36 (varnost,
        obveščanje o kršitvah, ocene učinkov).
      </p>
      <h2>7. Kršitve varstva podatkov</h2>
      <p>
        Obdelovalec upravljavca brez nepotrebnega odlašanja obvesti o kršitvi varstva osebnih
        podatkov in mu posreduje informacije, potrebne za izpolnitev obveznosti obveščanja.
      </p>
      <h2>8. Izbris ali vračilo</h2>
      <p>
        Po prenehanju razmerja obdelovalec po izbiri upravljavca podatke vrne (celovit izvoz je v
        Storitvi na voljo ves čas) in/ali izbriše, razen kjer pravo EU ali države članice zahteva
        hrambo.
      </p>
      <h2>9. Revizije</h2>
      <p>
        Obdelovalec upravljavcu da na voljo informacije, potrebne za dokazovanje skladnosti s tem
        členom, in omogoči razumne revizije, izvedene na način, ki ne ogroža varnosti drugih
        najemnikov.
      </p>
    </LegalPage>
  );
}
