import { useEffect } from "react"
import { BrowserRouter, Route, Routes, useParams } from "react-router-dom"
import Distribute from "pages/distribute"
import NotFound from "pages/not-found"
import Event from "pages/event"
import Loader from "pages/loader"
import PaymentSuccess from "pages/payment/success"
import PaymentCancel from "pages/payment/cancel"
import { STORAGE_KEY_PLACES_IN_ORDERS } from "const"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/success" element={<PaymentSuccess />} />
        <Route path="/cancel" element={<PaymentCancel />} />
        <Route element={<Loader />}>
          <Route path="*" element={<Event />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}