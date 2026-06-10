import { LegalPage } from '@/components/marketing';

export const metadata = { title: 'Pogoji uporabe — A-SPRINT GARAGE' };

export default function TermsPage() {
  return (
    <LegalPage title="Pogoji uporabe" updated="10. 6. 2026">
      <h2>1. Ponudnik in storitev</h2>
      <p>
        Storitev »A-SPRINT GARAGE — AI Workshop OS« (v nadaljevanju: Storitev) je spletna programska
        oprema za vodenje servisnih delavnic, ki jo zagotavlja A-SPRINT d.o.o. (v nadaljevanju:
        Ponudnik). Z registracijo računa naročnik sprejme te pogoje.
      </p>
      <h2>2. Račun in odgovornost naročnika</h2>
      <p>
        Naročnik odgovarja za resničnost podatkov ob registraciji, za varovanje prijavnih podatkov
        svojih uporabnikov ter za vsa dejanja, opravljena prek njegovih uporabniških računov.
        Storitev je namenjena poslovni rabi (B2B).
      </p>
      <h2>3. Naročnina, preizkus in plačila</h2>
      <p>
        Nove delavnice prejmejo 14-dnevni brezplačni preizkus brez plačilnega sredstva. Naročnina se
        obračunava mesečno vnaprej po veljavnem ceniku; plačila obdeluje Stripe. Za vsako plačilo
        Ponudnik izda račun. Cene so brez DDV.
      </p>
      <h2>4. Iztek in prekinitev</h2>
      <p>
        Po izteku preizkusa ali ob neplačilu se urejanje podatkov zamrzne, dostop do branja in
        izvoza vseh podatkov pa ostane odprt (»mehki paywall«). Naročnik lahko naročnino kadar koli
        prekine; obračunsko obdobje se izteče ob koncu plačanega meseca.
      </p>
      <h2>5. Podatki naročnika</h2>
      <p>
        Vsi vneseni podatki (stranke, vozila, nalogi, računi …) so in ostanejo last naročnika.
        Naročnik lahko kadar koli prenese celoten posnetek svojih podatkov. Obdelavo osebnih
        podatkov ureja <a href="/pravno/zasebnost">Politika zasebnosti</a> in
        <a href="/pravno/dpa"> Pogodba o obdelavi podatkov (DPA)</a>.
      </p>
      <h2>6. Dovoljena raba</h2>
      <p>
        Prepovedani so poskusi nepooblaščenega dostopa, obhajanje varnostnih mehanizmov, preprodaja
        Storitve brez dogovora in raba v nasprotju s predpisi. Ponudnik sme ob hudi kršitvi račun
        začasno omejiti, o čemer naročnika obvesti.
      </p>
      <h2>7. Razpoložljivost in podpora</h2>
      <p>
        Ponudnik si prizadeva za visoko razpoložljivost, vzdrževalna dela napove vnaprej, kadar je
        to mogoče. Storitev se zagotavlja »takšna, kot je«; AI funkcije so pomoč in ne nadomeščajo
        strokovne presoje naročnika (npr. tehnične, davčne ali pravne).
      </p>
      <h2>8. Omejitev odgovornosti</h2>
      <p>
        V največjem obsegu, ki ga dopušča pravo, je skupna odgovornost Ponudnika omejena na znesek
        naročnin, ki jih je naročnik plačal v zadnjih 12 mesecih. Ponudnik ne odgovarja za posredno
        škodo ali izgubljeni dobiček.
      </p>
      <h2>9. Spremembe pogojev</h2>
      <p>
        Ponudnik lahko pogoje posodobi; o bistvenih spremembah naročnika obvesti vsaj 30 dni prej.
        Nadaljnja uporaba po uveljavitvi pomeni sprejem sprememb.
      </p>
      <h2>10. Pravo in spori</h2>
      <p>
        Uporablja se pravo Republike Slovenije. Za spore je pristojno stvarno pristojno sodišče po
        sedežu Ponudnika.
      </p>
    </LegalPage>
  );
}
