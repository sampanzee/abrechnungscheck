# Abrechnungscheck

Prüft die DIAKOVERE-Gehaltsmitteilung (TV DN Ärztinnen und Ärzte) gegen die Vivendi-Monatsauswertung und schätzt das Netto.

**Alle Daten bleiben auf dem eigenen Gerät.** Es gibt keinen Server, kein Konto und keine Übertragung. Gespeichert wird im Browser (localStorage). Über „Sicherung“ lässt sich eine Datei exportieren und auf einem anderen Gerät importieren.

## Benutzen

1. Seite auf dem Handy öffnen und über das Browser-Menü „Zum Startbildschirm hinzufügen“. Danach funktioniert die App auch offline.
2. Einmal die **Einrichtung** durchgehen (Entgeltgruppe, Stufe, Stunden, Kinder, Steuerklasse, Krankenkasse, Versorgungswerk).
3. Das **Vivendi-PDF** (Einzelabrechnung) eines Monats laden.
4. Die **Gehaltsmitteilung zwei Monate später** fotografieren oder die Werte von Hand eintragen.

## Was geprüft wird

- Zulagen aus der Spalte „Vormonate“: Sonntag, Feiertag, Nacht, Bereitschaftsdienst (Stufen, +10 Punkte ab dem 16. BD in 3 Monaten, kurzfristige Änderungen), BD-Zuschlag, Nacht im BD, Feiertag im BD, Vertretungszuschlag (DV Ausfallmanagement), Überstunden-Zuschlag, Urlaubs- und Krankheitsaufschlag, Zeitguthaben
- Entgelt, Kinderzulage, Schichtzulage
- Netto nach dem Lohnsteuer-Programmablaufplan 2026 und den SV-Werten 2026
- Zusatzurlaub (30 BD im Halbjahr, Nachtstunden)

## Anpassen

Unter **Tarifwerte** lassen sich neue Entgelttabellen (Stichtage), Zulagen, Vertretungszuschläge, BD-Bewertung sowie Steuer- und SV-Werte für neue Jahre eintragen.

## Technik

Reines HTML/JavaScript ohne Build. Bibliotheken: pdf.js (cdnjs) für die Vivendi-PDFs, tesseract.js (jsDelivr) mit deutschen Sprachdaten (`deu.traineddata`) für die Fotoerkennung. Beide werden beim ersten Gebrauch geladen und vom Service Worker für die Offline-Nutzung gespeichert.

Ohne Gewähr. Die Prüfung ersetzt keine Beratung durch Personalabteilung, Personalvertretung oder Marburger Bund.
