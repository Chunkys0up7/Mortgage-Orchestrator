import { pgTable, text, serial, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const borrowersTable = pgTable("borrowers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  ssn: text("ssn"),
  dateOfBirth: text("date_of_birth"),
  employmentStatus: text("employment_status").notNull().default("employed"),
  annualIncome: numeric("annual_income", { precision: 15, scale: 2 }),
  creditScore: integer("credit_score"),
  currentAddress: text("current_address"),
  crmSource: text("crm_source").notNull().default("manual"),
  crmId: text("crm_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBorrowerSchema = createInsertSchema(borrowersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBorrower = z.infer<typeof insertBorrowerSchema>;
export type Borrower = typeof borrowersTable.$inferSelect;

export const loanProductsTable = pgTable("loan_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  productType: text("product_type").notNull(),
  description: text("description").notNull(),
  minLoanAmount: numeric("min_loan_amount", { precision: 15, scale: 2 }).notNull(),
  maxLoanAmount: numeric("max_loan_amount", { precision: 15, scale: 2 }).notNull(),
  minCreditScore: integer("min_credit_score").notNull(),
  maxLtv: numeric("max_ltv", { precision: 5, scale: 2 }).notNull(),
  maxDti: numeric("max_dti", { precision: 5, scale: 2 }).notNull(),
  term: integer("term").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  features: text("features").array().notNull().default([]),
  eligibilityNotes: text("eligibility_notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLoanProductSchema = createInsertSchema(loanProductsTable).omit({ id: true, createdAt: true });
export type InsertLoanProduct = z.infer<typeof insertLoanProductSchema>;
export type LoanProduct = typeof loanProductsTable.$inferSelect;

export const loansTable = pgTable("loans", {
  id: serial("id").primaryKey(),
  loanNumber: text("loan_number").notNull().unique(),
  borrowerId: integer("borrower_id").notNull(),
  borrowerName: text("borrower_name").notNull(),
  propertyAddress: text("property_address").notNull(),
  loanAmount: numeric("loan_amount", { precision: 15, scale: 2 }).notNull(),
  loanType: text("loan_type").notNull(),
  productId: integer("product_id"),
  interestRate: numeric("interest_rate", { precision: 6, scale: 4 }),
  ltv: numeric("ltv", { precision: 5, scale: 2 }),
  dti: numeric("dti", { precision: 5, scale: 2 }),
  creditScore: integer("credit_score"),
  status: text("status").notNull().default("active"),
  stage: text("stage").notNull().default("application"),
  loanOfficer: text("loan_officer").notNull(),
  processor: text("processor"),
  closingDate: text("closing_date"),
  purchasePrice: numeric("purchase_price", { precision: 15, scale: 2 }),
  downPayment: numeric("down_payment", { precision: 15, scale: 2 }),
  loanPurpose: text("loan_purpose").notNull().default("purchase"),
  propertyType: text("property_type").notNull().default("single_family"),
  occupancyType: text("occupancy_type").notNull().default("primary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLoanSchema = createInsertSchema(loansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loansTable.$inferSelect;

export const loanNotesTable = pgTable("loan_notes", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull(),
  author: text("author").notNull(),
  content: text("content").notNull(),
  noteType: text("note_type").notNull().default("general"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLoanNoteSchema = createInsertSchema(loanNotesTable).omit({ id: true, createdAt: true });
export type InsertLoanNote = z.infer<typeof insertLoanNoteSchema>;
export type LoanNote = typeof loanNotesTable.$inferSelect;

export const loanDocumentsTable = pgTable("loan_documents", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull(),
  documentName: text("document_name").notNull(),
  documentType: text("document_type").notNull(),
  status: text("status").notNull().default("pending"),
  required: boolean("required").notNull().default(true),
  receivedAt: text("received_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLoanDocumentSchema = createInsertSchema(loanDocumentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLoanDocument = z.infer<typeof insertLoanDocumentSchema>;
export type LoanDocument = typeof loanDocumentsTable.$inferSelect;

export const mortgageRatesTable = pgTable("mortgage_rates", {
  id: serial("id").primaryKey(),
  productType: text("product_type").notNull(),
  term: integer("term").notNull(),
  rate: numeric("rate", { precision: 6, scale: 4 }).notNull(),
  apr: numeric("apr", { precision: 6, scale: 4 }).notNull(),
  points: numeric("points", { precision: 5, scale: 3 }).notNull().default("0"),
  effectiveDate: text("effective_date").notNull(),
  source: text("source").notNull().default("internal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMortgageRateSchema = createInsertSchema(mortgageRatesTable).omit({ id: true, createdAt: true });
export type InsertMortgageRate = z.infer<typeof insertMortgageRateSchema>;
export type MortgageRate = typeof mortgageRatesTable.$inferSelect;

export const knowledgeArticlesTable = pgTable("knowledge_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  source: text("source").notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array().notNull().default([]),
  url: text("url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKnowledgeArticleSchema = createInsertSchema(knowledgeArticlesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKnowledgeArticle = z.infer<typeof insertKnowledgeArticleSchema>;
export type KnowledgeArticle = typeof knowledgeArticlesTable.$inferSelect;

export const activityLogTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull(),
  loanNumber: text("loan_number").notNull(),
  borrowerName: text("borrower_name").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  actor: text("actor").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogTable).omit({ id: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogTable.$inferSelect;
