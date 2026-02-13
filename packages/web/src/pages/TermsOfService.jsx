import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/login" className="flex items-center space-x-2 text-gray-300 hover:text-white transition">
              <FaArrowLeft />
              <span>Powrot do strony glownej</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-gray-400 mb-8">Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Akceptacja warunkow</h2>
              <p className="text-gray-300 leading-relaxed">
                Korzystajac z bota KiraEvo ("Usluga"), akceptujesz niniejsze Warunki korzystania z uslugi.
                Jesli nie zgadzasz sie z tymi warunkami, prosimy o niekorzystanie z Uslugi.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Opis uslugi</h2>
              <p className="text-gray-300 leading-relaxed">
                KiraEvo to bot Discord oferujacy funkcje takie jak:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-2 space-y-1">
                <li>System poziomow i XP</li>
                <li>Automatyczna moderacja</li>
                <li>System giveaways</li>
                <li>Reaction roles</li>
                <li>Custom commands</li>
                <li>System powitalen i pozegnan</li>
                <li>Panel webowy do konfiguracji</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Konto uzytkownika</h2>
              <p className="text-gray-300 leading-relaxed">
                Aby korzystac z panelu webowego, musisz zalogowac sie przez Discord OAuth2.
                Jestes odpowiedzialny za bezpieczenstwo swojego konta Discord.
                Nie ponosimy odpowiedzialnosci za nieautoryzowany dostep do Twojego konta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Zasady korzystania</h2>
              <p className="text-gray-300 leading-relaxed">
                Uzywajac Uslugi, zgadzasz sie:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-2 space-y-1">
                <li>Nie uzywac bota do celow niezgodnych z prawem</li>
                <li>Nie wykorzystywac bota do spamu lub naduzywania API Discord</li>
                <li>Nie probowac hakowania, eksploitowania lub zaklocania dzialania Uslugi</li>
                <li>Przestrzegac Warunkow korzystania z Discord</li>
                <li>Nie uzywac bota do napasci, nienawisci lub dyskryminacji</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Dostepnosc uslugi</h2>
              <p className="text-gray-300 leading-relaxed">
                Dokladamy starannosci, aby Usluga byla dostepna 24/7, jednak nie gwarantujemy
                nieprzerwanego dzialania. Usluga moze byc czasowo niedostepna z powodu
                konserwacji, aktualizacji lub okolicznosci od nas niezaleznych.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Ograniczenie odpowiedzialnosci</h2>
              <p className="text-gray-300 leading-relaxed">
                Usluga jest dostarczana "tak jak jest" bez zadnych gwarancji.
                Nie ponosimy odpowiedzialnosci za jakiekolwiek szkody wynikajace
                z korzystania lub niemoznosci korzystania z Uslugi.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Zmiany w warunkach</h2>
              <p className="text-gray-300 leading-relaxed">
                Zastrzegamy sobie prawo do modyfikacji niniejszych Warunkow w dowolnym momencie.
                Kontynuowanie korzystania z Uslugi po wprowadzeniu zmian oznacza ich akceptacje.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Zakonczenie uslugi</h2>
              <p className="text-gray-300 leading-relaxed">
                Mozemy zawiesic lub zakonszyc dostep do Uslugi w dowolnym momencie,
                z dowolnego powodu, bez wczesniejszego powiadomienia.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Kontakt</h2>
              <p className="text-gray-300 leading-relaxed">
                W przypadku pytan dotyczacych niniejszych Warunkow, prosimy o kontakt
                poprzez serwer Discord lub inne dostepne kanaly komunikacji.
              </p>
            </section>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-8 text-center text-gray-400 space-x-4">
          <Link to="/login" className="hover:text-white transition">Strona glowna</Link>
          <span>|</span>
          <Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
