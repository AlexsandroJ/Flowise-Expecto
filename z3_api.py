from flask import Flask, request, jsonify
import re
from z3 import *
import json

app = Flask(__name__)

@app.route('/validate', methods=['POST'])
def validate():
    try:
        try:
            data = request.get_json(force=True)
        except Exception as e:
            return jsonify({
                "status": "ERRO_JSON",
                "msg": f"Texto não é JSON válido. Remova markdown e use aspas duplas. Erro: {str(e)}"
            }), 200
        
        dsl_code = data.get('dsl_code', '')
        io_examples = data.get('io_examples', [])

        if not dsl_code:
            return jsonify({"status": "ERRO", "msg": "Campo 'dsl_code' está vazio."}), 200

        # Detectar se é bloco multi-função (contém \n\n ou múltiplas "def ")
        functions = re.findall(r'def\s+(\w+)\s*\((.*?)\)\s*:\s*(.*?)(?=\n\s*def\s+|\Z)', 
                               dsl_code, re.DOTALL)
        
        if not functions:
            return jsonify({
                "status": "ERRO_SINTAXE",
                "msg": "Nenhuma função DSL encontrada. Use: def Nome(var: int): And(...)"
            }), 200

        # Compilar todas as funções
        z3_env = {"And": And, "Or": Or, "Not": Not, "Implies": Implies, "Abs": Abs, "__builtins__": {}}
        
        for func_name, params_str, body_str in functions:
            # Traduzir símbolos unicode
            body_str = body_str.replace('∧', 'And').replace('∨', 'Or').replace('¬', 'Not').replace('→', 'Implies')
            
            # Criar variáveis
            var_names = [v.split(':')[0].strip() for v in params_str.split(',') if v.strip()]
            z3_vars = {name: Int(name) for name in var_names}
            
            # Avaliar corpo
            local_env = dict(z3_env)
            local_env.update(z3_vars)
            
            try:
                func_body = eval(body_str.strip(), local_env, {})
            except Exception as e:
                return jsonify({
                    "status": "ERRO_Z3",
                    "msg": f"Erro na função {func_name}: {str(e)}. Corpo: {body_str.strip()}"
                }), 200
            
            # Registrar como função lambda no ambiente global
            z3_env[func_name] = lambda *args, f=func_body, v=z3_vars: f.subs(dict(zip(v.keys(), args)))

        # Validar contra exemplos usando a ÚLTIMA função (Spec)
        main_func_name = functions[-1][0]
        main_var_names = [v.split(':')[0].strip() for v in functions[-1][1].split(',') if v.strip()]
        main_z3_vars = {name: Int(name) for name in main_var_names}
        
        solver = Solver()
        
        for ex in io_examples:
            solver.push()
            inputs = ex.get('inputs', {})
            expected = ex.get('expected', True)
            
            # Aplicar restrições de igualdade
            for var_name, var_value in inputs.items():
                if var_name in main_z3_vars:
                    solver.add(main_z3_vars[var_name] == var_value)
            
            # Chamar a função principal
            try:
                args = [main_z3_vars[v] for v in main_var_names]
                constraint = z3_env[main_func_name](*args)
                solver.add(constraint)
            except Exception as e:
                return jsonify({
                    "status": "ERRO_Z3",
                    "msg": f"Erro ao chamar {main_func_name}: {str(e)}"
                }), 200
            
            result = solver.check()
            
            if expected and result == unsat:
                return jsonify({
                    "status": "UNSAT",
                    "msg": f"A DSL rejeitou um exemplo VÁLIDO. Contraexemplo: inputs={inputs}"
                }), 200
            if (not expected) and result == sat:
                return jsonify({
                    "status": "SAT_FAIL",
                    "msg": f"A DSL aceitou um exemplo INVÁLIDO. Contraexemplo: inputs={inputs}"
                }), 200
            
            solver.pop()

        return jsonify({
            "status": "SAT",
            "msg": f"Validação bem-sucedida. {len(functions)} função(ões) validadas contra {len(io_examples)} exemplo(s)."
        }), 200

    except Exception as e:
        return jsonify({"status": "ERRO_CRITICO", "msg": str(e)}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)