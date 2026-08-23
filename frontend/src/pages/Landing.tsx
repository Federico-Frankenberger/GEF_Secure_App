import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import ProductPreview from '../components/landing/ProductPreview'
import ProblemSolution from '../components/landing/ProblemSolution'
import HowItWorks from '../components/landing/HowItWorks'
import Features from '../components/landing/Features'
import IntelligencePipeline from '../components/landing/IntelligencePipeline'
import RiskPrioritization from '../components/landing/RiskPrioritization'
import BenefitsUseCases from '../components/landing/BenefitsUseCases'
import SecurityArchitecture from '../components/landing/SecurityArchitecture'
import FAQ from '../components/landing/FAQ'
import ContactCTA from '../components/landing/ContactCTA'
import Footer from '../components/landing/Footer'

/** Landing pública de GEF Secure (docs/bitacora/23-08-26/prompt_landing_comercial_gef_secure.md).
 *  Un usuario ya autenticado que llega a "/" no tiene motivo para ver la landing --
 *  va directo a su dashboard, mismo criterio que cualquier SaaS (Stripe, Notion, etc.). */
export default function Landing() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="bg-surface-900 min-h-screen">
      <Navbar />
      <Hero />
      <ProductPreview />
      <ProblemSolution />
      <HowItWorks />
      <Features />
      <IntelligencePipeline />
      <RiskPrioritization />
      <BenefitsUseCases />
      <SecurityArchitecture />
      <FAQ />
      <ContactCTA />
      <Footer />
    </div>
  )
}
