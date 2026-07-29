"use client"

import { useEffect } from "react"

export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    // In development the dev server rebuilds assets constantly and routes are
    // recompiled on demand, so a worker sitting in front of them serves stale
    // chunks and masks real errors. Tear down anything registered previously
    // (including workers left over from a production build on the same origin)
    // instead of registering.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister())
      })

      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key))
        })
      }

      return
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => {
        console.log("Service Worker registered successfully")
      })
      .catch((error) => {
        console.log("Service Worker registration failed:", error)
      })
  }, [])

  return null
}
