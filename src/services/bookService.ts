import type { Env } from '../types';

export class BookService {
  constructor(private env: Env) {}

  async getBookContent(bookNumber: number, chapterNumber: number, table: string = 'draft_1'): Promise<string | null> {
    let db: D1Database;
    
    switch (bookNumber) {
      case 0:
        db = this.env.BOOK_0_DEMOCRACY;
        break;
      case 1:
        db = this.env.BOOK_1_LEGAL_SURVIVAL;
        break;
      case 2:
        db = this.env.BOOK_2_INTERNATIONAL;
        break;
      case 3:
        db = this.env.BOOK_3_DOMESTIC;
        break;
      case 4:
        db = this.env.BOOK_4_VOID;
        break;
      case 5:
        db = this.env.BOOK_5_WHISTLEBLOWERS;
        break;
      default:
        throw new Error(`Invalid book number: ${bookNumber}`);
    }

    try {
      const result = await db.prepare(
        `SELECT content FROM ${table} WHERE chapter_number = ?`
      ).bind(chapterNumber).first();
      
      return result?.content as string || null;
    } catch (error) {
      console.error(`Error fetching book ${bookNumber}, chapter ${chapterNumber}:`, error);
      return null;
    }
  }

  async getBookMetadata(bookNumber: number): Promise<any> {
    let db: D1Database;
    
    switch (bookNumber) {
      case 0:
        db = this.env.BOOK_0_DEMOCRACY;
        break;
      case 1:
        db = this.env.BOOK_1_LEGAL_SURVIVAL;
        break;
      case 2:
        db = this.env.BOOK_2_INTERNATIONAL;
        break;
      case 3:
        db = this.env.BOOK_3_DOMESTIC;
        break;
      case 4:
        db = this.env.BOOK_4_VOID;
        break;
      case 5:
        db = this.env.BOOK_5_WHISTLEBLOWERS;
        break;
      default:
        throw new Error(`Invalid book number: ${bookNumber}`);
    }

    try {
      const titles = await db.prepare(
        `SELECT chapter_number, title FROM chapter_titles ORDER BY chapter_number`
      ).all();
      
      const summaries = await db.prepare(
        `SELECT chapter_number, summary_text FROM chapter_summaries ORDER BY chapter_number`
      ).all();
      
      return {
        bookNumber,
        chapters: titles.results,
        summaries: summaries.results
      };
    } catch (error) {
      console.error(`Error fetching metadata for book ${bookNumber}:`, error);
      return null;
    }
  }

  async searchBooks(searchTerm: string): Promise<any[]> {
    const results = [];
    const books = [
      { number: 0, name: 'Democracy Is Dead', db: this.env.BOOK_0_DEMOCRACY },
      { number: 1, name: 'Legal Survival Guide', db: this.env.BOOK_1_LEGAL_SURVIVAL },
      { number: 2, name: 'Britain & International Law', db: this.env.BOOK_2_INTERNATIONAL },
      { number: 3, name: 'Britain & Domestic Law', db: this.env.BOOK_3_DOMESTIC },
      { number: 4, name: 'Void ab Initio', db: this.env.BOOK_4_VOID },
      { number: 5, name: 'The Last Whistleblowers', db: this.env.BOOK_5_WHISTLEBLOWERS }
    ];

    for (const book of books) {
      try {
        // Search in draft content
        const searchResults = await book.db.prepare(
          `SELECT chapter_number, 
                  SUBSTR(content, MAX(1, INSTR(LOWER(content), LOWER(?)) - 100), 300) as excerpt
           FROM draft_1 
           WHERE LOWER(content) LIKE LOWER(?)`
        ).bind(searchTerm, `%${searchTerm}%`).all();

        if (searchResults.results.length > 0) {
          results.push({
            book: book.name,
            bookNumber: book.number,
            matches: searchResults.results
          });
        }
      } catch (error) {
        console.error(`Error searching book ${book.number}:`, error);
      }
    }

    return results;
  }

  // Get relevant content for specific legal topics
  async getRelevantContent(topic: string): Promise<any> {
    const relevantChapters = {
      'democracy': [
        { book: 0, chapters: [1, 2, 3, 4, 5, 6, 7] }
      ],
      'systemic issues': [
        { book: 0, chapters: [1, 2, 3, 4, 5] },
        { book: 4, chapters: [1, 2] }
      ],
      'void orders': [
        { book: 4, chapters: [1, 2, 3, 4, 5, 6, 7, 8] },
        { book: 3, chapters: [4, 5] }
      ],
      'appeals': [
        { book: 1, chapters: [7, 8] },
        { book: 3, chapters: [8] },
        { book: 4, chapters: [5, 6] }
      ],
      'costs': [
        { book: 1, chapters: [6] },
        { book: 3, chapters: [6] }
      ],
      'jurisdiction': [
        { book: 3, chapters: [4] },
        { book: 4, chapters: [1, 2, 3] }
      ],
      'international law': [
        { book: 2, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        { book: 4, chapters: [2] }
      ],
      'eviction': [
        { book: 3, chapters: [2, 4] },
        { book: 1, chapters: [3, 4] }
      ]
    };

    const content = [];
    const relevantRefs = relevantChapters[topic.toLowerCase()] || [];
    
    for (const ref of relevantRefs) {
      for (const chapterNum of ref.chapters) {
        const chapterContent = await this.getBookContent(ref.book, chapterNum);
        if (chapterContent) {
          content.push({
            book: ref.book,
            chapter: chapterNum,
            preview: chapterContent.substring(0, 500) + '...'
          });
        }
      }
    }
    
    return content;
  }
}