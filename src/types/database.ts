export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      proposals: {
        Row: {
          id: string;
          title: string;
          company_name: string;
          status: 'draft' | 'ready' | 'archived';
          description: string | null;
          amount: number | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          company_name: string;
          status?: 'draft' | 'ready' | 'archived';
          description?: string | null;
          amount?: number | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          company_name?: string;
          status?: 'draft' | 'ready' | 'archived';
          description?: string | null;
          amount?: number | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      proposal_sections: {
        Row: {
          id: string;
          proposal_id: string;
          section_title: string;
          section_type: string;
          content: any;
          order_index: number;
          is_ai_generated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          proposal_id: string;
          section_title: string;
          section_type: string;
          content: any;
          order_index: number;
          is_ai_generated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          proposal_id?: string;
          section_title?: string;
          section_type?: string;
          content?: any;
          order_index?: number;
          is_ai_generated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_sessions: {
        Row: {
          id: string;
          proposal_id: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          proposal_id: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          proposal_id?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          metadata: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          metadata?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: 'user' | 'assistant' | 'system';
          content?: string;
          metadata?: any | null;
          created_at?: string;
        };
      };
    };
  };
}