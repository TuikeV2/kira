import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Wprowadzenie</h2>
              <p className="text-gray-300 leading-relaxed">
                Niniejsza Polityka Prywatnosci opisuje, jakie dane zbieramy, jak je wykorzystujemy
                i jak je chronimy podczas korzystania z bota KiraEvo i powiazanego panelu webowego.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Zbierane dane</h2>
              <p className="text-gray-300 leading-relaxed">
                Zbieramy nastepujace rodzaje danych:
              </p>

              <h3 className="text-lg font-medium text-white mt-4 mb-2">2.1 Dane z Discord</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>ID uzytkownika Discord</li>
                <li>Nazwa uzytkownika i avatar</li>
                <li>ID serwerow, na ktorych bot jest obecny</li>
                <li>Role i uprawnienia na serwerach</li>
              </ul>

              <h3 className="text-lg font-medium text-white mt-4 mb-2">2.2 Dane funkcjonalne</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>Punkty doswiadczenia (XP) i poziomy uzytkownikow</li>
                <li>Statystyki wiadomosci (liczba, nie tresc)</li>
                <li>Konfiguracja serwerow (ustawienia bota)</li>
                <li>Logi moderacji (ostrzezenia, wyciszenia)</li>
                <li>Dane giveaways (uczestnicy, zwyciezcy)</li>
              </ul>

              <h3 className="text-lg font-medium text-white mt-4 mb-2">2.3 Dane techniczne</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>Logi bledow i diagnostyka</li>
                <li>Statystyki uzycia komend</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Jak wykorzystujemy dane</h2>
              <p className="text-gray-300 leading-relaxed">
                Zebrane dane wykorzystujemy wylacznie do:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-2 space-y-1">
                <li>Swiadczenia funkcji bota (system poziomow, moderacja, giveaways)</li>
                <li>Umozliwienia konfiguracji przez panel webowy</li>
                <li>Poprawy jakosci i stabilnosci uslugi</li>
                <li>Diagnozowania i naprawiania problemow technicznych</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Udostepnianie danych</h2>
              <p className="text-gray-300 leading-relaxed">
                <strong>Nie sprzedajemy, nie udostepniamy i nie przekazujemy Twoich danych osobom trzecim</strong>,
                z wyjatkiem nastepujacych sytuacji:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-2 space-y-1">
                <li>Gdy jest to wymagane przez prawo</li>
                <li>Gdy jest to niezbedne do ochrony naszych praw</li>
                <li>Administratorom serwerow (tylko dane dotyczace ich serwera)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Przechowywanie danych</h2>
              <p className="text-gray-300 leading-relaxed">
                Dane sa przechowywane na bezpiecznych serwerach. Przechowujemy dane tak dlugo,
                jak bot jest obecny na serwerze lub do momentu zadania ich usuniecia.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Bezpieczenstwo danych</h2>
              <p className="text-gray-300 leading-relaxed">
                Stosujemy odpowiednie srodki techniczne i organizacyjne w celu ochrony danych,
                w tym szyfrowanie, kontrole dostepu i regularne kopie zapasowe.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Twoje prawa</h2>
              <p className="text-gray-300 leading-relaxed">
                Masz prawo do:
              </p>
              <ul className="list-disc list-inside text-gray-300 mt-2 space-y-1">
                <li>Dostepu do swoich danych</li>
                <li>Sprostowania nieprawidlowych danych</li>
                <li>Usuniecia swoich danych (prawo do bycia zapomnianym)</li>
                <li>Sprzeciwu wobec przetwarzania danych</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-2">
                Aby skorzystac z tych praw, skontaktuj sie z nami poprzez serwer Discord.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Usuwanie danych</h2>
              <p className="text-gray-300 leading-relaxed">
                Gdy bot zostanie usuniety z serwera, dane konfiguracyjne serwera zostana
                oznaczone jako nieaktywne. Mozesz zadac calkowitego usuniecia danych
                kontaktujac sie z nami.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Dzieci</h2>
              <p className="text-gray-300 leading-relaxed">
                Nasza usluga nie jest przeznaczona dla osob ponizej 13 roku zycia
                (lub innego wieku wymaganego przez Discord w danym kraju).
                Nie zbieramy swiadomie danych od dzieci.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Zmiany w polityce</h2>
              <p className="text-gray-300 leading-relaxed">
                Mozemy aktualizowac niniejsza Polityke Prywatnosci. O istotnych zmianach
                poinformujemy poprzez ogloszenie na serwerze Discord lub w panelu webowym.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">11. Kontakt</h2>
              <p className="text-gray-300 leading-relaxed">
                W przypadku pytan dotyczacych prywatnosci lub zadania usuniecia danych,
                prosimy o kontakt poprzez serwer Discord lub inne dostepne kanaly komunikacji.
              </p>
            </section>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-8 text-center text-gray-400 space-x-4">
          <Link to="/login" className="hover:text-white transition">Strona glowna</Link>
          <span>|</span>
          <Link to="/terms" className="hover:text-white transition">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
