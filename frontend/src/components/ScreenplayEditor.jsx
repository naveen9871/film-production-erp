import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

const ScreenplayEditor = ({ initialContent, onUpdate }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your story or screenplay...',
      }),
    ],
    content: initialContent || '<p></p>',
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON(), editor.getText());
    },
    editorProps: {
      attributes: {
        class: 'screenplay-editor-prose',
      },
    },
  });

  return (
    <div style={{ padding: '20px', background: '#fff', borderRadius: '12px', minHeight: '600px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      {/* We can add a simple formatting toolbar here if we want */}
      <div className="editor-toolbar" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <button 
          className={`btn-icon ${editor?.isActive('heading', { level: 1 }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          Scene
        </button>
        <button 
          className={`btn-icon ${editor?.isActive('bold') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Character
        </button>
        <button 
          className="btn-icon"
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          Action
        </button>
      </div>
      <EditorContent editor={editor} />
      
      <style>{`
        .screenplay-editor-prose {
          outline: none;
          font-family: 'Courier Prime', 'Courier New', monospace;
          font-size: 16px;
          line-height: 1.6;
        }
        .screenplay-editor-prose h1 {
          font-size: 16px;
          text-transform: uppercase;
          margin-top: 24px;
          margin-bottom: 12px;
          font-weight: bold;
        }
        .screenplay-editor-prose p {
          margin-bottom: 12px;
        }
        .screenplay-editor-prose strong {
          display: block;
          text-align: center;
          text-transform: uppercase;
          width: 50%;
          margin: 16px auto 0;
        }
      `}</style>
    </div>
  );
};

export default ScreenplayEditor;
