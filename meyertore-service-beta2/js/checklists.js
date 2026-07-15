(function () {
  "use strict";

  const item = (id, group, label) => ({ id, group, label });

  const industrialSectional = [
    item("doc-nameplate", "Dokumentation", "Typenschild, CE-Kennzeichnung und Anlagenkennzeichnung vorhanden und lesbar"),
    item("doc-logbook", "Dokumentation", "Prüfbuch, Betriebs- und Wartungsanleitung vorhanden"),
    item("doc-changes", "Dokumentation", "Umbauten und Änderungen dokumentiert; keine unzulässigen Veränderungen"),
    item("leaf-panels", "Torblatt", "Sektionen / Lamellen auf Beschädigung, Korrosion und festen Verbund geprüft"),
    item("leaf-hinges", "Torblatt", "Mittelscharniere, Seitenscharniere und Befestigungen geprüft"),
    item("leaf-rollers", "Torblatt", "Laufrollen, Rollenhalter und Rollenachsen auf Zustand und Spiel geprüft"),
    item("leaf-glazing", "Torblatt", "Verglasungen, Füllungen und Halteleisten unbeschädigt und sicher befestigt"),
    item("leaf-seals", "Torblatt", "Boden-, Sturz- und Seitendichtungen auf Zustand und Funktion geprüft"),
    item("leaf-wicket", "Torblatt", "Schlupftür, Bänder, Schließer und Verriegelung geprüft"),
    item("tracks-fixing", "Führung und Beschlag", "Laufschienen, Zargen und Konsolen vollständig und sicher befestigt"),
    item("tracks-joints", "Führung und Beschlag", "Schienenstöße, Verbindungselemente und Abhängungen geprüft"),
    item("tracks-stops", "Führung und Beschlag", "Endanschläge und Puffer vorhanden und sicher befestigt"),
    item("tracks-clearance", "Führung und Beschlag", "Torlauf frei, keine gefährlichen Einzugs- oder Quetschstellen"),
    item("balance-springs", "Gewichtsausgleich", "Torsions- / Zugfedern auf Bruch, Korrosion und Vorspannung geprüft"),
    item("balance-shaft", "Gewichtsausgleich", "Federwelle, Kupplungen, Lager und Konsolen geprüft"),
    item("balance-cables", "Gewichtsausgleich", "Tragmittel / Seile auf Verschleiß, Drahtbrüche und korrekten Sitz geprüft"),
    item("balance-drums", "Gewichtsausgleich", "Seiltrommeln und Befestigung auf Zustand und korrekten Seillauf geprüft"),
    item("balance-fall", "Gewichtsausgleich", "Federbruch- / Seilbruchsicherung bzw. Absturzsicherung geprüft"),
    item("balance-manual", "Gewichtsausgleich", "Tor ist von Hand leichtgängig und ausreichend ausbalanciert"),
    item("drive-fixing", "Antrieb und Steuerung", "Motor-, Getriebe-, Kettenbox- und Konsolenbefestigung geprüft"),
    item("drive-noise", "Antrieb und Steuerung", "Motor und Getriebe auf Geräusche, Erwärmung und Dichtigkeit geprüft"),
    item("drive-chain", "Antrieb und Steuerung", "Antriebskette, Kettenrad, Spannung und Schutzabdeckung geprüft"),
    item("drive-emergency", "Antrieb und Steuerung", "Nothandbetätigung / Notentriegelung und elektrische Verriegelung geprüft"),
    item("drive-limits", "Antrieb und Steuerung", "Endlagen, Endschalter und Hauptstromendschalter geprüft"),
    item("drive-control", "Antrieb und Steuerung", "Steuerung, Taster, Befehlsgeräte und Gehäusezustand geprüft"),
    item("drive-main", "Antrieb und Steuerung", "Verriegelbarer Hauptschalter vorhanden und funktionsfähig"),
    item("drive-protection", "Antrieb und Steuerung", "Motorschutz und elektrische Zuleitungen augenscheinlich geprüft"),
    item("safety-edge", "Schutzeinrichtungen", "Schließkantensicherung / Druckwellensystem auf Zustand und Funktion geprüft"),
    item("safety-photo", "Schutzeinrichtungen", "Lichtschranke / Lichtgitter auf Ausrichtung und Funktion geprüft"),
    item("safety-wicket", "Schutzeinrichtungen", "Schlupftürkontakt verhindert Torbewegung zuverlässig"),
    item("safety-slack", "Schutzeinrichtungen", "Schlaffseilschalter / Tragmittelsicherung geprüft"),
    item("safety-force", "Schutzeinrichtungen", "Kraftbegrenzung / Kraftmessung entsprechend Einsatz und Vorgaben geprüft"),
    item("safety-stop", "Schutzeinrichtungen", "Not-Halt / Stopp-Funktion und Wiederanlaufschutz geprüft"),
    item("function-travel", "Funktion", "Vollständiger Torlauf AUF und ZU ruhig und ohne Behinderung"),
    item("function-reverse", "Funktion", "Sicherheitsrücklauf / Reversierung und Wiederöffnung geprüft"),
    item("maintenance-final", "Abschluss", "Schraubverbindungen kontrolliert, erforderliche Schmier- und Pflegearbeiten durchgeführt")
  ];

  const rollDoor = [
    item("roll-motor-fixing", "1. Antrieb", "Motor- und Konsolenbefestigung"),
    item("roll-motor-noise", "1. Antrieb", "Geräusche und Dichtigkeit von Motor und Getriebe"),
    item("roll-emergency", "1. Antrieb", "Nothandbetätigung und elektrische Verriegelung"),
    item("roll-limits", "2. Schaltautomat", "Endschaltereinstellung und Funktion"),
    item("roll-main-limit", "2. Schaltautomat", "Funktion des Hauptstromendschalters"),
    item("roll-motor-protection", "2. Schaltautomat", "Einstellung des Motorschutzschalters"),
    item("roll-buttons", "2. Schaltautomat", "Elektrische und mechanische Funktion der Drucktaster"),
    item("roll-catch", "3. Abrollsicherung", "Fangvorrichtung vorhanden und funktionsfähig"),
    item("roll-catch-fixing", "3. Abrollsicherung", "Befestigung und Zustand der Fangvorrichtung"),
    item("roll-catch-moving", "3. Abrollsicherung", "Bewegliche Teile: Verschleiß, Korrosion und Gängigkeit"),
    item("roll-catch-label", "3. Abrollsicherung", "Schild der Fangvorrichtung vollständig und lesbar"),
    item("roll-shaft-welds", "4. Welle und Lagerung", "Schweißnähte der Achszapfen und Konsolen"),
    item("roll-shaft-bearings", "4. Welle und Lagerung", "Achszapfen, Lager und Stellringe"),
    item("roll-shaft-console", "4. Welle und Lagerung", "Befestigung der Lagerkonsolen"),
    item("roll-curtain", "5. Panzer / Behang", "Zustand und Verschleiß des Panzers / Behanges"),
    item("roll-curtain-fixing", "5. Panzer / Behang", "Aufhängung und Befestigungsschrauben"),
    item("roll-bottom-edge", "6. Unterschienenabschaltung", "Kontaktschiene / DW-System: Zustand und Funktion"),
    item("roll-guides-fixing", "7. Führungsschienen", "Befestigung und Zustand, insbesondere Deformation"),
    item("roll-guides-wear", "7. Führungsschienen", "Verschleiß und Schmierung"),
    item("roll-funnel", "7. Führungsschienen", "Einlauftrichter und Einlaufbereich"),
    item("roll-inserts", "7. Führungsschienen", "Kunststoffeinlagen: Zustand und Sitz"),
    item("roll-main-switch", "8. Elektrische Sicherheit", "Verschließbarer Hauptschalter vorhanden und funktionsfähig"),
    item("roll-travel", "9. Funktionsprüfung", "Vollständiger Torlauf AUF / ZU, Endlagen und Stopp"),
    item("roll-protection", "9. Funktionsprüfung", "Weitere Schutzeinrichtungen, Lichtschranken und Not-Halt geprüft")
  ];

  const garage = [
    item("garage-nameplate", "Dokumentation", "Typenschild und Kennzeichnung vorhanden und lesbar"),
    item("garage-leaf", "Torblatt", "Lamellen / Torblatt auf Beschädigung, Korrosion und festen Verbund geprüft"),
    item("garage-hinges", "Torblatt", "Scharniere, Rollenhalter und Befestigungen geprüft"),
    item("garage-rollers", "Führung", "Laufrollen, Rollenachsen und Führungsschienen geprüft"),
    item("garage-tracks", "Führung", "Schienen, Zargen, Abhängungen und Endanschläge sicher befestigt"),
    item("garage-cables", "Gewichtsausgleich", "Tragseile, Seiltrommeln und Seilführung geprüft"),
    item("garage-springs", "Gewichtsausgleich", "Federn und Federbefestigungen auf Zustand und Spannung geprüft"),
    item("garage-balance", "Gewichtsausgleich", "Tor von Hand leichtgängig und ausreichend ausbalanciert"),
    item("garage-drive", "Antrieb", "Antriebsschiene, Motor und Befestigung geprüft"),
    item("garage-carriage", "Antrieb", "Führungsschlitten, Mitnehmer und mechanische Verriegelung geprüft"),
    item("garage-emergency", "Antrieb", "Notentriegelung / Notöffnung funktionsfähig"),
    item("garage-limits", "Antrieb", "Endlagen AUF / ZU und Teilöffnung geprüft"),
    item("garage-force", "Sicherheit", "Kraftbegrenzung und Sicherheitsrücklauf geprüft"),
    item("garage-photo", "Sicherheit", "Lichtschranke und weitere Schutzeinrichtungen geprüft"),
    item("garage-wicket", "Sicherheit", "Schlupftürkontakt und Türschließer geprüft"),
    item("garage-seals", "Abschluss", "Dichtungen und Bodenabschluss geprüft"),
    item("garage-controls", "Abschluss", "Handsender, Taster und Beleuchtung funktionsfähig"),
    item("garage-final", "Abschluss", "Schrauben kontrolliert, erforderliche Pflege / Schmierung durchgeführt")
  ];

  const highSpeed = [
    item("hs-nameplate", "Dokumentation", "Typenschild, Kennzeichnung und Prüfbuch vorhanden"),
    item("hs-curtain", "Behang", "Behang / Paneele auf Risse, Verformung und Verschleiß geprüft"),
    item("hs-bottom", "Behang", "Bodenabschluss / SoftEdge-Profil auf Zustand geprüft"),
    item("hs-zippers", "Behang", "Seitliche Führung, Reißverschluss / Windtaschen geprüft"),
    item("hs-guides", "Konstruktion", "Führungsschienen und Zargenbefestigung geprüft"),
    item("hs-shaft", "Konstruktion", "Wickelwelle, Lagerung und Konsolen geprüft"),
    item("hs-springs", "Konstruktion", "Gewichtsausgleich / Gegengewicht / Federn geprüft"),
    item("hs-drive", "Antrieb", "Antrieb, Getriebe und Befestigung auf Zustand und Geräusche geprüft"),
    item("hs-brake", "Antrieb", "Bremse und Fangvorrichtung / Absturzsicherung geprüft"),
    item("hs-emergency", "Antrieb", "Nothandbetätigung und Notöffnung geprüft"),
    item("hs-control", "Steuerung", "Steuerungsgehäuse, Anzeige und Bedienelemente geprüft"),
    item("hs-limits", "Steuerung", "Endlagen, Referenzfahrt und Öffnungshöhe geprüft"),
    item("hs-speeds", "Steuerung", "Öffnungs- und Schließgeschwindigkeit plausibel"),
    item("hs-edge", "Sicherheit", "Schließkantensicherung / SoftEdge-Auswertung geprüft"),
    item("hs-grid", "Sicherheit", "Lichtgitter / Lichtschranke vollständig geprüft"),
    item("hs-radar", "Sicherheit", "Radar, Zugschalter oder Induktionsschleife geprüft"),
    item("hs-stop", "Sicherheit", "Not-Halt und Stopp-Funktion geprüft"),
    item("hs-restart", "Sicherheit", "Wiederanlaufschutz nach Spannungsunterbrechung geprüft"),
    item("hs-travel", "Funktion", "Mehrere vollständige Torzyklen störungsfrei durchgeführt"),
    item("hs-crash", "Funktion", "Crash- / Wiedereinfädelfunktion geprüft, sofern vorhanden"),
    item("hs-final", "Abschluss", "Befestigungen kontrolliert, gereinigt und erforderliche Wartung durchgeführt")
  ];

  const generic = [
    item("generic-nameplate", "Dokumentation", "Typenschild und Anlagenkennzeichnung vorhanden und lesbar"),
    item("generic-docs", "Dokumentation", "Prüfbuch und Betriebsunterlagen vorhanden"),
    item("generic-construction", "Konstruktion", "Tragende Teile, Befestigungen und Verbindungen geprüft"),
    item("generic-leaf", "Konstruktion", "Torblatt / Behang auf Zustand und Verschleiß geprüft"),
    item("generic-guides", "Konstruktion", "Führungen, Lager, Rollen und bewegliche Teile geprüft"),
    item("generic-balance", "Mechanik", "Gewichtsausgleich und Tragmittel geprüft"),
    item("generic-drive", "Antrieb", "Antrieb, Getriebe und Befestigung geprüft"),
    item("generic-emergency", "Antrieb", "Notbetätigung / Notentriegelung geprüft"),
    item("generic-control", "Steuerung", "Steuerung, Endlagen und Befehlsgeräte geprüft"),
    item("generic-main", "Steuerung", "Hauptschalter, Leitungen und augensichtliche elektrische Sicherheit geprüft"),
    item("generic-protection", "Sicherheit", "Schutzeinrichtungen und Sicherheitsschalter geprüft"),
    item("generic-stop", "Sicherheit", "Stopp- / Not-Halt-Funktion geprüft"),
    item("generic-travel", "Funktion", "Vollständiger Öffnungs- und Schließzyklus geprüft"),
    item("generic-reverse", "Funktion", "Reversierung / Sicherheitsrücklauf geprüft"),
    item("generic-final", "Abschluss", "Erforderliche Wartungs-, Reinigungs- und Schmierarbeiten durchgeführt")
  ];

  function templateFor(category) {
    if (["industrial-roll", "industrial-grille"].includes(category)) return { key: "roll", title: "Prüfung Rolltor / Rollgitter", items: rollDoor };
    if (category === "high-speed") return { key: "high-speed", title: "Prüfung Schnelllauftor", items: highSpeed };
    if (["garage-sectional", "garage-side-sectional", "garage-up-over", "garage-roll", "garage-overhead", "garage-hinged"].includes(category)) return { key: "garage", title: "Prüfung Garagentor", items: garage };
    if (["industrial-sectional", "collective-garage"].includes(category)) return { key: "industrial-sectional", title: "Prüfung Industrie-Sektionaltor", items: industrialSectional };
    return { key: "generic", title: "Allgemeine Torprüfung", items: generic };
  }

  window.MEYER_CHECKLISTS = {
    statuses: [
      { id: "ok", short: "o. B.", label: "ohne Beanstandung" },
      { id: "maintenance", short: "Wart.", label: "Wartung erforderlich" },
      { id: "repair", short: "Mangel", label: "Reparatur / Mangel" },
      { id: "na", short: "n. z.", label: "nicht zutreffend" }
    ],
    templates: { industrialSectional, rollDoor, garage, highSpeed, generic },
    templateFor
  };
})();
