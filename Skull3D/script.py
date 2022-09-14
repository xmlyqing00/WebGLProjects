
def main():
    
    sticks_file = open("models/ani2/ben-stick.cm", "r")
    sticks_st_txt = sticks_file.read()
    sticks_file.close()

    sticks_file = open("models/ani2/jacky-stick.cm", "r")
    sticks_ed_txt = sticks_file.read()
    sticks_file.close()

    sticks_st_arr = sticks_st_txt.split("\n")
    sticks_ed_arr = sticks_ed_txt.split("\n")

    point_st_list = []
    point_ed1_list = []
    point_ed2_list = []

    for i in range(0, len(sticks_st_arr), 2):

        tuple_st = sticks_st_arr[i].split(" ")
        tuple_ed1 = sticks_st_arr[i + 1].split(" ")
        tuple_ed2 = sticks_ed_arr[i + 1].split(" ")

        if tuple_ed1[0] == "Vertex":

            point_st = [float(tuple_st[2]), float(tuple_st[3]), float(tuple_st[4])]
            point_ed1 = [float(tuple_ed1[2]), float(tuple_ed1[3]), float(tuple_ed1[4])]
            point_ed2 = [float(tuple_ed2[2]), float(tuple_ed2[3]), float(tuple_ed2[4])]

            # print(i, point_st, point_ed1, point_ed2)

            point_st_list.append(point_st)
            point_ed1_list.append(point_ed1)
            point_ed2_list.append(point_ed2)

    for i in range(1, 100):

        rate = (i-1) / 98

        file_name = "models/ani2/frame-" + str(i) + "_stick.cm"

        print(i, file_name, rate)

        file = open(file_name, "w")

        for j in range(len(point_st_list)):
            
            txt = "Vertex " + str(j * 2 + 1)
            for k in range(3):
                txt += " " + str(point_st_list[j][k])
            
            txt += "\n"
            txt += "Vertex " + str(j * 2 + 2)

            for k in range(3):
                txt += " " + str((1-rate) * point_ed1_list[j][k] + rate * point_ed2_list[j][k])
            
            txt += "\n"
            file.write(txt)
        
        file.close()


if __name__ == "__main__":
    main()

