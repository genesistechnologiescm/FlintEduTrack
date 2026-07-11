export const metadata = { title: "EduTrack · Offline lessons · Leçons hors ligne" };

// Deliberately minimal: the content is rendered by /offline-lessons.js (plain
// JS, no framework — a native <script> tag, NOT next/script, so it still runs
// when the app bundle can't load) from lessons saved on the device. Both the
// HTML and the script are precached by the service worker at install time.
export default function OfflineLessonsPage() {
  return (
    <main className="mx-auto max-w-[560px] px-4 pb-16 pt-6">
      <div id="offline-root" />
      <script src="/offline-lessons.js" defer />
      <noscript>Enable JavaScript to view saved lessons. · Activez JavaScript pour voir les leçons.</noscript>
    </main>
  );
}
