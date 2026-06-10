import { LegalPage } from '@/components/marketing';

export const metadata = { title: 'Politika zasebnosti — A-SPRINT GARAGE' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Politika zasebnosti" updated="10. 6. 2026">
      <h2>1. Vloge po GDPR</h2>
      <p>
        Za podatke o naročnikovih strankah, vozilih in dokumentih, ki jih delavnica vnaša v
        Storitev, je <strong>upravljavec naročnik</strong> (delavnica), Ponudnik pa
        <strong> obdelovalec</strong> po <a href="/pravno/dpa">Pogodbi o obdelavi (DPA)</a>.
        Za podatke o uporabniških računih in zaračunavanju je upravljavec Ponudnik.
      </p>
      <h2>2. Katere podatke obdelujemo kot upravljavec</h2>
      <ul>
        <li>Registracijski podatki: e-pošta, ime, naziv delavnice, geslo (shranjeno izključno kot kriptografski izvleček).</li>
        <li>Podatki o naročnini in plačilih: paket, status, identifikatorji plačil (kartic ne vidimo in ne hranimo — obdeluje jih Stripe).</li>
        <li>Tehnični dnevniki in revizijska sled dostopov zaradi varnosti in dokazljivosti.</li>
      </ul>
      <h2>3. Nameni in pravne podlage</h2>
      <p>
        Izvajanje pogodbe (zagotavljanje Storitve, podpora, obračun — čl. 6(1)(b) GDPR), zakonske
        obveznosti (računovodski in davčni predpisi — čl. 6(1)(c)) ter zakoniti interes (varnost,
        preprečevanje zlorab — čl. 6(1)(f)). Marketinška sporočila pošiljamo le s privolitvijo.
      </p>
      <h2>4. Obdelovalci in prenosi</h2>
      <p>
        Uporabljamo skrbno izbrane podobdelovalce: gostovanje infrastrukture (EU), Stripe
        (plačila), Resend (transakcijska e-pošta) ter ponudnike AI obdelave, konfigurirane za EU
        rezidenčnost. Seznam podobdelovalcev je del DPA; o spremembah obveščamo vnaprej.
      </p>
      <h2>5. Hramba</h2>
      <p>
        Podatke hranimo, dokler traja naročniško razmerje; po prekinitvi jih na zahtevo izbrišemo
        ali vrnemo (izvoz), razen kjer zakon zahteva daljšo hrambo (npr. računovodska
        dokumentacija). Revizijske sledi hranimo zaradi varnosti omejen čas.
      </p>
      <h2>6. Varnost</h2>
      <p>
        Stroga ločenost najemnikov na ravni baze (vrstična varnost), šifriran prenos, revizijska
        sled z verigo izvlečkov, načelo najmanjših privilegijev ter redne varnostne kopije.
      </p>
      <h2>7. Vaše pravice</h2>
      <p>
        Posameznik ima pravico do dostopa, popravka, izbrisa, omejitve, prenosljivosti in ugovora
        ter pravico do pritožbe pri Informacijskem pooblaščencu RS. Zahteve sprejemamo na
        e-naslovu, objavljenem na strani s kontakti; kadar smo obdelovalec, zahtevo nemudoma
        posredujemo upravljavcu (delavnici).
      </p>
      <h2>8. Piškotki</h2>
      <p>
        Aplikacija uporablja izključno nujne tehnične mehanizme za prijavo in delovanje; sledilnih
        oglaševalskih piškotkov ne uporabljamo.
      </p>
    </LegalPage>
  );
}
