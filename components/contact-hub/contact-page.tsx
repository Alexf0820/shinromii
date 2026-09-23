import Link from "next/link";
import { ContactForm } from "./contact-form";
import styles from "./contact.module.css";
export function ContactPage({ english = false, home = "/" }: { english?: boolean; home?: string }) {
  return <main className={styles.shell}><Link href={home}>SHINROMii</Link><h1>{english ? "Contact" : "お問い合わせ"}</h1><ContactForm english={english} /></main>;
}
