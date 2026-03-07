import type { Express } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { storage } from "./storage";

const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

/**
 * Advanced Layer 7 Adaptive RAG Intelligence Pipeline
 */
export class RAGPipeline {

    /**
     * Stage 1: Intent classification & Query Complexity Scoring
     */
    static async analyzeQuery(query: string) {
        // Dynamic Model Routing (Simple -> Mini, Complex -> Omni)
        const complexityScore = query.length > 50 || query.includes('why') || query.includes('how') ? 'complex' : 'simple';
        const modelTarget = complexityScore === 'complex' ? 'gpt-4o' : 'gpt-4o-mini';

        return {
            intent: 'knowledge_retrieval',
            complexity: complexityScore,
            model: modelTarget,
            needsExpansion: complexityScore === 'complex',
        };
    }

    /**
     * Stage 2 & 3: Hybrid Retrieval Pipeline (BM25 + Vector Similarity + RRF) Mock implementation
     */
    static async retrieveDocuments(query: string, tenantId: number, userContext: any) {
        const allDocs = await storage.getDocuments(tenantId);

        // ABAC Security Layer (Access Control)
        const accessibleDocs = allDocs.filter(doc => {
            // Students cannot see Teacher/Admin specialized data
            if (userContext.role === 'STUDENT' && doc.category === 'FINANCE') return false;
            if (userContext.role === 'TEACHER' && doc.category === 'ADMIN_FINANCE') return false;
            return true;
        });

        // Semantic Keyword Search & Vector Mock (Stage 1 & 2)
        const queryLower = query.toLowerCase();
        let relevantDocs = accessibleDocs.filter(doc =>
            doc.title.toLowerCase().includes(queryLower) ||
            doc.content.toLowerCase().includes(queryLower)
        );

        // If query is expanded, apply MMR diversity and cross-encoder reranking (Mock values)
        if (relevantDocs.length === 0) {
            return { docs: [], maxConfidence: 0.1 };
        }

        return {
            docs: relevantDocs.slice(0, 5), // Return top 5
            maxConfidence: 0.85, // Mock confidence score
        };
    }

    /**
     * Knowledge Gap Detection if confidence is low
     */
    static async handleKnowledgeGap(query: string, tenantId: number) {
        console.warn(`[KNOWLEDGE GAP DETECTED]: Logging gap for query: "${query}"`);
        // In production: Save to Knowledge Gaps database table for admin review
        return {
            gapDetected: true,
            message: "The information is not available in the university knowledge base.",
            adminNotified: true,
        };
    }

    /**
     * Core RAG Execution
     */
    static async execute(req: any, queryStr: string) {
        const userId = req.user?.id;
        const role = req.user?.role || "STUDENT"; // Added role
        const department = req.user?.department || "General";

        // Simulating user tenant resolution
        const tenants = await storage.getAllTenants();
        const userTenant = tenants[0];

        // 1. Intent Classification
        const analysis = await this.analyzeQuery(queryStr);

        // 2. Retrieval & Security Enforcement
        const retrievalResult = await this.retrieveDocuments(queryStr, userTenant.id, { role, department });

        // 3. Knowledge Gap Check
        if (retrievalResult.docs.length === 0 || retrievalResult.maxConfidence < 0.7) {
            const gapResponse = await this.handleKnowledgeGap(queryStr, userTenant.id);
            return { response: gapResponse.message, sources: [], confidence: 'Low', modelUsed: analysis.model };
        }

        // 4. Prompt Construction & Temporal Context
        const contextStr = retrievalResult.docs
            .map(doc => `[Source: ${doc.title} - Category: ${doc.category || 'General'}]\n${doc.content}`)
            .join('\n\n');

        const systemPrompt = `You are an Environment-Adaptive Multi-Tenant AI Assistant for a University.
Current User Role: ${role}
Current User Department: ${department}

RULES:
- You must use the retrieved knowledge context provided below.
- Do NOT leak cross-tenant data. Act strictly within the permissions of the current user.
- If the context does not fully answer the question, state: "The information is not available in the university knowledge base."
- Maintain strict confidence and cite the source name in your answer.

CONTEXT:
${contextStr}`;

        // 5. LLM Generation
        const completion = await openai.chat.completions.create({
            model: analysis.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: queryStr },
            ],
            max_completion_tokens: 1024,
        });

        const answer = completion.choices[0]?.message?.content || "No response generated.";

        // Save query to DB
        const savedQuery = await storage.createQuery({
            tenantId: userTenant.id,
            userId,
            query: queryStr,
            response: answer,
            context: contextStr,
            relevantDocs: retrievalResult.docs.map(d => d.title),
        });

        return {
            response: answer,
            sources: retrievalResult.docs.map(d => ({ title: d.title, category: d.category })),
            confidence: retrievalResult.maxConfidence > 0.8 ? 'High' : 'Medium',
            modelUsed: analysis.model,
            queryId: savedQuery.id
        };
    }
}
