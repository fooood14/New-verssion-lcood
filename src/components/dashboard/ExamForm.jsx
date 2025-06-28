import { useState } from "react";
import supabase from "../../supabase";

const ExamForm = ({ onQuestionAdded }) => {
  const [type, setType] = useState("normal");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [subQ1, setSubQ1] = useState("");
  const [subQ2, setSubQ2] = useState("");
  const [correct1, setCorrect1] = useState("");
  const [correct2, setCorrect2] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload =
      type === "normal"
        ? {
            question_text: question,
            options,
            correct_answer: correctAnswer,
            type: "normal",
          }
        : {
            type: "compound",
            sub_question_1: subQ1,
            sub_question_2: subQ2,
            correct_answer_1: correct1,
            correct_answer_2: correct2,
          };

    const { error } = await supabase.from("questions").insert(payload);

    if (error) {
      alert("خطأ في الإرسال: " + error.message);
    } else {
      alert("تمت الإضافة بنجاح");
      onQuestionAdded();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded bg-white">
      <label>نوع السؤال:</label>
      <select value={type} onChange={(e) => setType(e.target.value)} className="border p-1">
        <option value="normal">عادي</option>
        <option value="compound">مركب</option>
      </select>

      {type === "normal" && (
        <>
          <input
            type="text"
            placeholder="نص السؤال"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full border p-2"
          />
          {options.map((opt, index) => (
            <input
              key={index}
              type="text"
              placeholder={`اختيار ${index + 1}`}
              value={opt}
              onChange={(e) => {
                const newOptions = [...options];
                newOptions[index] = e.target.value;
                setOptions(newOptions);
              }}
              className="w-full border p-2 mt-1"
            />
          ))}
          <input
            type="text"
            placeholder="الإجابة الصحيحة"
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            className="w-full border p-2 mt-2"
          />
        </>
      )}

      {type === "compound" && (
        <>
          <input
            type="text"
            placeholder="الشطر الأول"
            value={subQ1}
            onChange={(e) => setSubQ1(e.target.value)}
            className="w-full border p-2"
          />
          <input
            type="text"
            placeholder="الشطر الثاني"
            value={subQ2}
            onChange={(e) => setSubQ2(e.target.value)}
            className="w-full border p-2 mt-2"
          />
          <input
            type="text"
            placeholder="الإجابة الصحيحة للشطر الأول"
            value={correct1}
            onChange={(e) => setCorrect1(e.target.value)}
            className="w-full border p-2 mt-2"
          />
          <input
            type="text"
            placeholder="الإجابة الصحيحة للشطر الثاني"
            value={correct2}
            onChange={(e) => setCorrect2(e.target.value)}
            className="w-full border p-2 mt-2"
          />
        </>
      )}

      <button type="submit" className="bg-blue-500 text-white p-2 rounded">
        حفظ السؤال
      </button>
    </form>
  );
};

export default ExamForm;
